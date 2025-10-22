import {decodeText, encodeText} from 'edacation';
import path from 'path';

import type {ExtensionMessage, MessageFile, WorkerMessage} from '../common/messages.js';
import {importModule, onEvent, sendMessage} from '../common/universal-worker.js';

try {
    process.on('unhandledRejection', (err) => {
        throw err;
    });
} catch (err) {
    /* ignore */
}

type OutputStream = (bytes: Uint8Array | null) => void;

interface RunOptions {
    stdout?: OutputStream | null;
    stderr?: OutputStream | null;
    decodeASCII?: boolean;
}

type Tree = {
    [name: string]: Tree | string | Uint8Array;
};

type ExportType = 'default' | 'type' | 'browser';

interface PackageJson {
    exports: Record<ExportType, string>;
}

type Command = (args?: string[], files?: Tree, options?: RunOptions) => Promise<Tree>;

interface ToolBundle {
    commands: Record<string, Command>;
}

const sanitizePaths = (array: MessageFile[]) =>
    array.map((file) => {
        if (file.path.startsWith('/')) {
            throw new Error('Absolute paths are not supported.');
        } else if (file.path.startsWith('../')) {
            throw new Error('Some relative paths are not supported.');
        }

        return {
            ...file,
            path: file.path.startsWith('./') ? file.path.substring(2) : file.path
        };
    });

const arrayToTree = (array: MessageFile[]): Tree => {
    const tree: Tree = {};
    for (const file of array) {
        console.log(`Adding ${file.path} to tree`);
        if (file.path.startsWith('/')) {
            throw new Error('Absolute paths are not supported.');
        } else if (file.path.startsWith('../')) {
            throw new Error('Some relative paths are not supported.');
        }

        const sanitizedPath = file.path.startsWith('./') ? file.path.substring(2) : file.path;
        const directories = sanitizedPath.includes('/') ? path.dirname(sanitizedPath).split('/') : [];
        const name = path.basename(sanitizedPath);

        let lastDirectory: Tree = tree;
        for (const directory of directories) {
            let newDirectory = lastDirectory[directory];
            if (!newDirectory) {
                console.log('creating', directory);
                newDirectory = {};
                lastDirectory[directory] = newDirectory;
            } else {
                console.log('navigating', directory);
            }

            if (typeof newDirectory === 'string' || newDirectory instanceof Uint8Array) {
                throw new Error(`${directory} is a file, cannot navigate`);
            }
            lastDirectory = newDirectory;
        }

        lastDirectory[name] = file.data;
    }
    return tree;
};

const arrayToList = (tree: Tree, path: string[] = []): MessageFile[] => {
    let array: MessageFile[] = [];
    for (const [name, data] of Object.entries(tree)) {
        if (typeof data === 'string' || data instanceof Uint8Array) {
            array.push({
                path: [...path, name].join('/'),
                data: typeof data === 'string' ? encodeText(data) : data
            });
        } else {
            array = array.concat(arrayToList(data, [...path, name]));
        }
    }
    return array;
};

export class WorkerTool {
    static CDN_BASE_URL = 'https://cdn.jsdelivr.net/npm/';
    static TOOL_BUNDLES: Record<string, string> = {
        yosys: '@yowasp/yosys',
        'nextpnr-ecp5': '@yowasp/nextpnr-ecp5',
        'nextpnr-ice40': '@yowasp/nextpnr-ice40',
        ecppack: '@yowasp/nextpnr-ecp5',
        openFPGALoader: '@yowasp/openfpgaloader'
    };

    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onEvent('message', this.handleMessage.bind(this));
        onEvent('messageerror', this.handleMessageError.bind(this));
    }

    protected send(message: ExtensionMessage, transferables: ArrayBufferLike[] = []) {
        // @ts-expect-error: node + web type clashing shenanigans
        sendMessage(message, transferables);
    }

    protected print(stream: 'stdout' | 'stderr', data: string) {
        this.send({
            type: 'terminal',
            stream,
            data
        });
    }

    protected printBytes(stream: 'stdout' | 'stderr', data: Uint8Array | null) {
        if (!data) {
            return;
        }

        this.print(stream, decodeText(data));
    }

    protected error(error: unknown) {
        console.trace(error);
        this.send({
            type: 'error',
            error: error instanceof Error || typeof error === 'string' ? error : 'Unknown error'
        });
    }

    // Derived from https://github.com/YoWASP/vscode
    // (c) Catherine, ISC Licensed
    private async getBundle(command: string): Promise<ToolBundle> {
        const bundleName = WorkerTool.TOOL_BUNDLES[command];
        if (!bundleName) throw new Error(`No bundle found for command "${command}"!`);
        const bundleUrl = new URL(bundleName + '/', WorkerTool.CDN_BASE_URL);

        const packageJsonUrl = new URL('./package.json', bundleUrl);
        const packageJson = (await fetch(packageJsonUrl).then((resp) => {
            if (!resp.ok) throw new Error('Tool could not be downloaded');
            return resp.json();
        })) as PackageJson;

        const entryPoint = packageJson.exports.browser ?? packageJson.exports.default;
        const entryPointURL = new URL(entryPoint, bundleUrl);

        return (await importModule(entryPointURL)) as ToolBundle;
    }

    private async handleMessage(message: WorkerMessage) {
        console.log(message);
        try {
            switch (message.type) {
                case 'input': {
                    // Convert input file array to a tree
                    const inputFiles = sanitizePaths(message.inputFiles);
                    const inputFileTree = arrayToTree(inputFiles);
                    console.log('input file tree', inputFileTree);

                    // Load commands
                    const commands: Map<string, Command> = new Map();
                    for (const step of message.steps) {
                        if (commands.has(step.tool)) continue;

                        const bundle = await this.getBundle(step.tool);
                        const toolCommand = bundle.commands[step.tool];
                        if (!toolCommand) throw new Error('Bundle does not contain tool command');

                        commands.set(step.tool, toolCommand);
                    }

                    // Execute
                    let workingTree: Tree = inputFileTree;
                    for (const step of message.steps) {
                        const toolCommand = commands.get(step.tool);
                        if (!toolCommand) throw new Error('Command not found');

                        this.print('stdout', `\n=== Executing ${step.tool} ${step.arguments.join(' ')} ===\n`);

                        workingTree = await toolCommand(step.arguments, workingTree, {
                            stdout: this.printBytes.bind(this, 'stdout'),
                            stderr: this.printBytes.bind(this, 'stderr'),
                            decodeASCII: false
                        });
                    }

                    // Convert output file tree to an array
                    console.log('output file tree', workingTree);
                    const outputFiles = arrayToList(workingTree).filter(
                        (outputFile) => !inputFiles.some((inputFile) => inputFile.path === outputFile.path)
                    );
                    console.log('output files', outputFiles);

                    // Send output to extension
                    this.send(
                        {
                            type: 'output',
                            files: outputFiles
                        },
                        outputFiles.map((file) => file.data.buffer)
                    );

                    break;
                }
            }
        } catch (err) {
            this.error(err);
        }
    }

    private handleMessageError(error: Error) {
        console.error('Message error:', error);

        this.error(new Error('Message error'));
    }
}

export const worker = new WorkerTool();
