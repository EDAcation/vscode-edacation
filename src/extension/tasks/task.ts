import {decodeText} from 'edacation';
import * as vscode from 'vscode';

import type {MessageFile} from '../../common/messages.js';
import {type Project} from '../projects/index.js';

import {type RunnerContext, type TaskRunner} from './runner.js';

export interface TaskOutputFile {
    path: string;
    uri: vscode.Uri;
}

export interface TaskDefinition extends vscode.TaskDefinition {
    project: string;
    targetId?: string;
    uri?: vscode.Uri;
}

export interface TaskMessage {
    type: string;
}

// TODO: abstract worker-specific code into TaskRunner
export abstract class TerminalTask<WorkerOptions> {
    private runner: TaskRunner;

    public taskEvents: vscode.EventEmitter<TaskMessage>;

    constructor(runner: TaskRunner) {
        this.runner = runner;

        this.taskEvents = new vscode.EventEmitter();
    }

    abstract getName(): string;

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

    async execute(project: Project, definition: TaskDefinition) {
        const workerOptions = this.getWorkerOptions(
            project,
            definition.targetId ?? project.getConfiguration().targets[0].id
        );

        const command = this.getInputCommand(workerOptions);
        const args = this.getInputArgs(workerOptions);
        const inputFiles = this.getInputFiles(workerOptions);
        const generatedInputFiles = this.getGeneratedInputFiles(workerOptions);
        const outputFiles = this.getOutputFiles(workerOptions);
        const workerFilename = this.getWorkerFileName(workerOptions);

        for (const inputFile of generatedInputFiles) {
            this.println(`${inputFile.path}:`);
            this.println(decodeText(inputFile.data));
            this.println();
        }

        this.println(`${command} ${args.join(' ')}`);
        this.println();

        const ctx: RunnerContext = {
            project,
            workerFilename,

            command,
            args,

            inputFiles,
            generatedInputFiles,
            outputFiles
        };
        await this.runner.run(ctx);
    }
}
