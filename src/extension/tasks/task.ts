import type * as vscode from 'vscode';

import type {MessageFile} from '../../common/messages.js';
import {type Project} from '../projects/index.js';

export interface TaskOutputFile {
    path: string;
    uri: vscode.Uri;
}

export abstract class TerminalTask<WorkerOptions> {
    abstract getName(): string;

    // TODO: abstract out into TaskRunner
    abstract getWorkerOptions(project: Project, targetId: string): WorkerOptions;

    abstract getWorkerFileName(workerOptions: WorkerOptions): string;

    abstract getInputCommand(workerOptions: WorkerOptions): string;

    abstract getInputArgs(workerOptions: WorkerOptions): string[];

    abstract getInputFiles(workerOptions: WorkerOptions): string[];

    abstract getGeneratedInputFiles(workerOptions: WorkerOptions): MessageFile[];

    abstract getOutputFiles(workerOptions: WorkerOptions): string[];

    abstract handleStart(project: Project): Promise<void>;

    abstract handleEnd(project: Project, outputFiles: TaskOutputFile[]): Promise<void>;

    protected println(line?: string) {
        // TODO: link up to terminal
        console.log(`TASK MESSAGE: ${line}`);
    }
}
