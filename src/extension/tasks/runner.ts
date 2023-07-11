import * as vscode from 'vscode';

import type {ExtensionMessage, MessageFile} from '../../common/messages.js';
import {type Project} from '../projects/index.js';

export interface RunnerContext {
    project: Project;
    workerFilename: string;

    command: string;
    args: string[];

    inputFiles: string[];
    generatedInputFiles: MessageFile[];
    outputFiles: string[];
}

export abstract class TaskRunner {
    protected extensionContext: vscode.ExtensionContext;

    constructor(extensionContext: vscode.ExtensionContext) {
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

        worker.addEventListener('message', this.handleMessage);
        worker.addEventListener('messageerror', this.handleMessageError);
        worker.addEventListener('error', this.handleError);

        return worker;
    }

    private handleMessage(event: MessageEvent<ExtensionMessage>) {
        console.log(`Message event: ${event}`);
    }

    private handleMessageError(event: MessageEvent) {
        console.error('Message error:', event);

        // this.error(new Error('Message error'), project);
    }

    private handleError(event: ErrorEvent) {
        console.error(`Error: ${event}`);
        // this.error(event.error, project);
    }
}

export class NativeTaskRunner extends TaskRunner {
    async run(_ctx: RunnerContext): Promise<void> {
        throw new Error('Method not implemented.');
    }
}
