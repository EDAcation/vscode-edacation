import {type WorkerOptions as _WorkerOptions, decodeText} from 'edacation';
import path from 'path-browserify';
import type * as vscode from 'vscode';

import {type Project} from '../projects/index.js';

import {AnsiModifier, type TaskOutputFile, type TerminalMessage, TerminalMessageEmitter} from './messaging.js';
import {type RunnerContext, type TaskRunner} from './runner.js';

export interface TaskDefinition extends vscode.TaskDefinition {
    project: string;
    targetId?: string;
    uri?: vscode.Uri;
}

export interface TaskIOFile {
    type: 'user' | 'artifact' | 'temp';
    path: string;
    data?: Uint8Array;
}

const getTaskFilePaths = (files: TaskIOFile[], relDir: string = '.'): TaskIOFile[] => {
    return files.map((file) => {
        // user files should not be touched
        if (file.type === 'user' || file.path.startsWith(relDir)) return file;

        if (file.type === 'temp') {
            // temporary file
            return {...file, path: path.join(relDir, 'temp', file.path)};
        } else {
            // artifact
            return {...file, path: path.join(relDir, file.path)};
        }
    });
};

export abstract class TerminalTask<WorkerOptions extends _WorkerOptions> extends TerminalMessageEmitter {
    private readonly runner: TaskRunner;

    private isDisabled: boolean;

    constructor(runner: TaskRunner) {
        super();

        this.runner = runner;
        // proxy all runner messages to terminal
        this.runner.onMessage(this.onRunnerMessage.bind(this));

        this.isDisabled = false;
    }

    abstract getName(): string;

    abstract getWorkerOptions(project: Project, targetId: string): WorkerOptions;

    abstract getWorkerFileName(workerOptions: WorkerOptions): string;

    abstract getInputCommand(workerOptions: WorkerOptions): string;

    abstract getInputArgs(workerOptions: WorkerOptions): string[];

    abstract getInputFiles(workerOptions: WorkerOptions): TaskIOFile[];

    abstract getOutputFiles(workerOptions: WorkerOptions): TaskIOFile[];

    abstract handleStart(project: Project): Promise<void>;

    abstract handleEnd(project: Project, outputFiles: TaskOutputFile[]): Promise<void>;

    private onRunnerMessage(message: TerminalMessage) {
        if (this.isDisabled) return;

        switch (message.type) {
            case 'println': {
                this.println(message.line, message.stream);
                break;
            }
            case 'done': {
                this.done(message.outputFiles);
                break;
            }
            case 'error': {
                this.error(message.error);
                break;
            }
        }
    }

    async execute(project: Project, definition: TaskDefinition) {
        const workerOptions = this.getWorkerOptions(
            project,
            definition.targetId ?? project.getConfiguration().targets[0].id
        );

        const command = this.getInputCommand(workerOptions);
        const args = this.getInputArgs(workerOptions);
        const inputFiles = getTaskFilePaths(this.getInputFiles(workerOptions), workerOptions.target.directory);
        const outputFiles = getTaskFilePaths(this.getOutputFiles(workerOptions), workerOptions.target.directory);
        const workerFilename = this.getWorkerFileName(workerOptions);

        // Pretty-print input files and their contents (if generated)
        for (const inputFile of inputFiles) {
            this.println(inputFile.path + (inputFile.data ? ':' : ''), undefined, AnsiModifier.BOLD);
            if (!inputFile.data) continue;

            const indented = decodeText(inputFile.data)
                .split('\n')
                .map((line) => '  ' + line)
                .join('\n');
            this.println(indented);
            this.println();
        }

        // Print the runner and command to execute
        this.println(`Runner command (${this.runner.getName()}):`, undefined, AnsiModifier.BOLD);
        this.println(`  ${command} ${args.join(' ')}`);
        this.println();

        const ctx: RunnerContext = {
            project,
            workerFilename,

            command,
            args,

            inputFiles,
            outputFiles
        };
        await this.runner.run(ctx);
    }

    cleanup() {
        this.isDisabled = true;
    }
}
