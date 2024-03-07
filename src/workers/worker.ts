import {decodeText, encodeText} from 'edacation';
import path from 'path';
import type {TransferListItem} from 'worker_threads';

import type {ExtensionMessage, MessageFile, WorkerMessage} from '../common/messages.js';
import {onEvent, sendMessage} from '../common/universal-worker.js';

try {
    process.on('unhandledRejection', (err) => {
        throw err;
    });
} catch (err) {
    /* ignore */
}

export type OutputStream = (bytes: Uint8Array | null) => void;

export interface RunOptions {
    stdout?: OutputStream | null;
    stderr?: OutputStream | null;
    decodeASCII?: boolean;
}

export type Tree = {
    [name: string]: Tree | string | Uint8Array;
};

const sanatizePaths = (array: MessageFile[]) =>
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
            console.log('creating', directory);
            const newDirectory: Tree = {};
            lastDirectory[directory] = newDirectory;
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

export abstract class WorkerTool {
    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onEvent('message', this.handleMessage.bind(this));
        onEvent('messageerror', this.handleMessageError.bind(this));
    }

    abstract run(args: string[], inputFileTree: Tree, options: RunOptions): Promise<Tree>;

    protected send(message: ExtensionMessage, transferables: readonly TransferListItem[] & Transferable[] = []) {
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

    private async handleMessage(message: WorkerMessage) {
        console.log(message);
        try {
            switch (message.type) {
                case 'input': {
                    // Convert input file array to a tree
                    const inputFiles = sanatizePaths(message.inputFiles);
                    const inputFileTree = arrayToTree(inputFiles);
                    console.log('input file tree', inputFileTree);

                    // Execute Emscripten tool
                    const outputFileTree = await this.run(message.args, inputFileTree, {
                        stdout: this.printBytes.bind(this, 'stdout'),
                        stderr: this.printBytes.bind(this, 'stderr'),
                        decodeASCII: false
                    });

                    // Convert output file tree to an array
                    console.log('output file tree', outputFileTree);
                    const outputFiles = arrayToList(outputFileTree).filter(
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
