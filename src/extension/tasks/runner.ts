import {spawn} from 'child_process';
import * as vscode from 'vscode';

import type {ExtensionMessage, MessageFile} from '../../common/messages.js';
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

    abstract run(ctx: RunnerContext): Promise<void>;
}

export class WebAssemblyTaskRunner extends TaskRunner {
    async run(ctx: RunnerContext): Promise<void> {
        const files = await this.readFiles(ctx.project, ctx.inputFiles);

        // Create & start worker
        const worker = this.createWorker(ctx.workerFilename);
        worker.postMessage(
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

    private createWorker(workerFilename: string): Worker {
        const worker = new Worker(
            vscode.Uri.joinPath(this.extensionContext.extensionUri, 'dist', 'workers', workerFilename).toString(true)
        );

        worker.addEventListener('message', (event) => this.handleMessage(event));
        worker.addEventListener('messageerror', (event) => this.handleMessageError(event));
        worker.addEventListener('error', (event) => this.handleError(event));

        return worker;
    }

    private handleMessage(event: MessageEvent<ExtensionMessage>) {
        try {
            switch (event.data.type) {
                case 'terminal': {
                    this.println(event.data.data, event.data.stream);

                    break;
                }
                case 'output': {
                    const outputFiles = event.data.files as TaskOutputFile[];
                    this.done(outputFiles);

                    break;
                }
                case 'error': {
                    const error = event.data.error;
                    this.error(typeof error === 'string' ? new Error(error) : error);

                    break;
                }
            }
        } catch (err) {
            this.error(err);
        }
    }

    private handleMessageError(event: MessageEvent) {
        console.error('Message error:', event);

        this.error(new Error('Message error'));
    }

    private handleError(event: ErrorEvent) {
        this.error(event.error);
    }
}

export class NativeTaskRunner extends TaskRunner {
    private lineBuffer: Record<'stdout' | 'stderr', string>;

    constructor(extensionContext: vscode.ExtensionContext) {
        super(extensionContext);

        this.lineBuffer = {
            stdout: '',
            stderr: ''
        };
    }

    async run(ctx: RunnerContext): Promise<void> {
        const proc = spawn(ctx.command, ctx.args, {
            cwd: ctx.project.getRoot().fsPath
        });

        proc.on('exit', (code, signal) => this.handleProcessExit(ctx, code, signal));
        proc.on('error', (error) => this.error(error));

        proc.stdout.on('data', (data) => this.onProcessData(data, 'stdout'));
        proc.stderr.on('data', (data) => this.onProcessData(data, 'stderr'));
    }

    private onProcessData(data: string, stream: 'stdout' | 'stderr') {
        this.lineBuffer[stream] += data;

        const lines = this.lineBuffer[stream].split('\n');
        this.lineBuffer[stream] = lines[lines.length - 1];

        for (const line of lines.slice(0, -1)) {
            this.println(line, stream);
        }
    }

    private handleProcessExit(ctx: RunnerContext, code: number | null, signal: string | null) {
        // flush buffers to get all output on the terminal
        if (this.lineBuffer['stdout'].length >= 0) {
            this.println(this.lineBuffer['stdout'], 'stdout');
        }
        if (this.lineBuffer['stderr'].length >= 0) {
            this.println(this.lineBuffer['stderr'], 'stderr');
        }

        if (code === 0) {
            const outputFiles = ctx.outputFiles.map((f) => ({path: f}));
            this.done(outputFiles);
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
