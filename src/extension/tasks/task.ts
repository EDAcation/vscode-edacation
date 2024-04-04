import {type WorkerOptions as _WorkerOptions, decodeText} from 'edacation';
import path from 'path-browserify';
import type * as vscode from 'vscode';

import type {MessageFile} from '../../common/messages.js';
import {type Project} from '../projects/index.js';

import {AnsiModifier, type TaskOutputFile, type TerminalMessage, TerminalMessageEmitter} from './messaging.js';
import {type RunnerContext, type TaskRunner} from './runner.js';

export interface TaskDefinition extends vscode.TaskDefinition {
    project: string;
    targetId?: string;
    uri?: vscode.Uri;
}

const _updateTaskFilePath = (p: string, relDir: string): string => {
    if (p.startsWith(relDir)) return p;
    return path.join(relDir, p);
};

const getTaskFilePaths = (paths: string[], relDir: string = '.'): string[] => {
    return paths.map((p) => _updateTaskFilePath(p, relDir));
};

const getGeneratedTaskFilePaths = (paths: MessageFile[], relDir: string = '.'): MessageFile[] => {
    return paths.map((p) => ({path: _updateTaskFilePath(p.path, relDir), data: p.data}));
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

    abstract getInputFiles(workerOptions: WorkerOptions): string[];

    abstract getGeneratedInputFiles(workerOptions: WorkerOptions): MessageFile[];

    abstract getOutputFiles(workerOptions: WorkerOptions): string[];

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
        const generatedInputFiles = getGeneratedTaskFilePaths(
            this.getGeneratedInputFiles(workerOptions),
            workerOptions.target.directory
        );
        const outputFiles = getTaskFilePaths(this.getOutputFiles(workerOptions), workerOptions.target.directory);
        const workerFilename = this.getWorkerFileName(workerOptions);

        // Pretty-print input files and their contents
        for (const inputFile of generatedInputFiles) {
            this.println(inputFile.path + ':', undefined, AnsiModifier.BOLD);

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
            generatedInputFiles,
            outputFiles
        };
        await this.runner.run(ctx);
    }

    cleanup() {
        this.isDisabled = true;
    }
}
