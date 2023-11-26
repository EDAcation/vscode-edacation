import * as vscode from 'vscode';

import type {ExtensionMessage, MessageFile} from '../../common/messages.js';
import {UniversalWorker} from '../../common/universal-worker.js';
import {type Project} from '../projects/index.js';

import {type TaskOutputFile, TerminalMessageEmitter} from './messaging.js';

export interface RunnerContext {
    project: Project;
    workerFilename: string;

    command: string;
    args: string[];

    inputFiles: string[];
    generatedInputFiles: MessageFile[];
    outputFiles: string[];
}

export abstract class TaskRunner extends TerminalMessageEmitter {
    protected readonly extensionContext: vscode.ExtensionContext;

    constructor(extensionContext: vscode.ExtensionContext) {
        super();

        this.extensionContext = extensionContext;
    }

    abstract getName(): string;

    abstract run(ctx: RunnerContext): Promise<void>;
}

export class WebAssemblyTaskRunner extends TaskRunner {
    getName() {
        return 'WebAssembly';
    }

    async run(ctx: RunnerContext): Promise<void> {
        const files = await this.readFiles(ctx.project, ctx.inputFiles);

        // Create & start worker
        const worker = this.createWorker(ctx.workerFilename);
        worker.sendMessage(
            {
                type: 'input',
                command: ctx.command,
                args: ctx.args,
                inputFiles: files.concat(ctx.generatedInputFiles),
                outputFiles: ctx.outputFiles
            },
            files.map(({data}) => data.buffer)
        );
    }

    private async readFiles(project: Project, inputFiles: string[]): Promise<MessageFile[]> {
        const files: MessageFile[] = [];
        for (const file of inputFiles) {
            const data = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(project.getRoot(), file));

            files.push({
                path: file,
                data
            });
        }

        return files;
    }

    private createWorker(workerFilename: string): UniversalWorker {
        const worker = new UniversalWorker(
            vscode.Uri.joinPath(this.extensionContext.extensionUri, 'dist', 'workers', workerFilename).toString(true)
        );

        worker.onEvent('message', this.handleMessage.bind(this));
        worker.onEvent('messageerror', this.handleMessageError.bind(this));
        worker.onEvent('error', this.handleError.bind(this));

        return worker;
    }

    private handleMessage(message: ExtensionMessage) {
        console.log('Worker -> runner:');
        console.log(message);
        try {
            switch (message.type) {
                case 'terminal': {
                    this.println(message.data, message.stream);

                    break;
                }
                case 'output': {
                    const outputFiles = message.files as TaskOutputFile[];
                    this.done(outputFiles);

                    break;
                }
                case 'error': {
                    const error = message.error;
                    this.error(typeof error === 'string' ? new Error(error) : error);

                    break;
                }
            }
        } catch (err) {
            this.error(err);
        }
    }

    private handleMessageError(event: Error) {
        console.error('Message error:', event);

        this.error(new Error('Message error'));
    }

    private handleError(event: Error) {
        console.log(event);

        this.error(event);
    }
}

export class NativeTaskRunner extends TaskRunner {
    private lineBuffer: Record<'stdout' | 'stderr', string>;

    getName() {
        return 'Native';
    }

    constructor(extensionContext: vscode.ExtensionContext) {
        super(extensionContext);

        this.lineBuffer = {
            stdout: '',
            stderr: ''
        };
    }

    async run(ctx: RunnerContext): Promise<void> {
        // Write generated input files so the native process can load them
        for (const file of ctx.generatedInputFiles) {
            const destUri = vscode.Uri.joinPath(ctx.project.getRoot(), file.path);
            await vscode.workspace.fs.writeFile(destUri, file.data);
        }

        const child_process = await import('child_process').catch(() => void 0);
        if (!child_process || !child_process.spawn) {
            this.error(
                'Unable to import required dependencies. Please note that the native runner is unavailable in a web environment.'
            );
            return;
        }

        const proc = child_process.spawn(ctx.command, ctx.args, {
            cwd: ctx.project.getRoot().fsPath
        });

        proc.on('exit', this.onProcessExit.bind(this, ctx));
        proc.on('error', this.onProcessError.bind(this));

        proc.stdout.on('data', (data) => this.onProcessData(data, 'stdout'));
        proc.stderr.on('data', (data) => this.onProcessData(data, 'stderr'));
    }

    private onProcessError(error: unknown) {
        if (error instanceof Error) {
            // ugly, but it's a nodejs error so there's no typings for the code attribute
            if (Object(error)?.code === 'ENOENT') {
                this.error(
                    'Could not find native runner entrypoint. Are Yosys/Nextpnr installed on your system and available in PATH?'
                );
                return;
            }
        }

        this.error(error);
    }

    private onProcessData(data: string, stream: 'stdout' | 'stderr') {
        this.lineBuffer[stream] += data;

        const lines = this.lineBuffer[stream].split('\n');
        this.lineBuffer[stream] = lines[lines.length - 1];

        for (const line of lines.slice(0, -1)) {
            this.println(line, stream);
        }
    }

    private onProcessExit(ctx: RunnerContext, code: number | null, signal: string | null) {
        // flush buffers to get all output on the terminal
        if (this.lineBuffer['stdout'].length > 0) {
            this.println(this.lineBuffer['stdout'], 'stdout');
        }
        if (this.lineBuffer['stderr'].length > 0) {
            this.println(this.lineBuffer['stderr'], 'stderr');
        }

        if (code === 0) {
            const outputFiles = ctx.outputFiles.map((file) => ({path: file}));
            const writtenInputFiles = ctx.generatedInputFiles.map((file) => ({path: file.path}));

            this.done(outputFiles.concat(writtenInputFiles));
        } else if (code !== null) {
            this.error(new Error(`Process exited with code ${code}`));
        } else {
            this.error(new Error(`Process was killed with signal: ${signal}`));
        }
    }
}

export const getConfiguredRunner = (context: vscode.ExtensionContext): TaskRunner => {
    const useNative = vscode.workspace.getConfiguration('edacation').get('useNativeRunners');

    if (useNative) {
        return new NativeTaskRunner(context);
    } else {
        return new WebAssemblyTaskRunner(context);
    }
};
