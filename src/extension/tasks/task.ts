import {type WorkerStep, type WorkerOptions as _WorkerOptions, decodeText} from 'edacation';
import path from 'path';
import type * as vscode from 'vscode';

import {type Project} from '../projects/index.js';

import {AnsiModifier, type TaskOutputFile, TerminalMessageEmitter} from './messaging.js';
import {type ToolProvider} from './toolprovider.js';

export interface TaskDefinition extends vscode.TaskDefinition {
    project: string;
    targetId: string;
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
        if (file.type === 'user') return file;

        // Do nothing if already in relDir
        const rel = path.relative(relDir, file.path);
        if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) return file;

        if (file.type === 'temp') {
            // temporary file
            return {...file, path: path.join(relDir, 'temp', file.path)};
        } else {
            // artifact
            return {...file, path: path.join(relDir, file.path)};
        }
    });
};

export abstract class TerminalTask<WorkerOptions extends _WorkerOptions<any, any>> extends TerminalMessageEmitter {
    private readonly toolProvider: ToolProvider;

    private isDisabled: boolean;

    constructor(toolProvider: ToolProvider) {
        super();

        this.toolProvider = toolProvider;
        // proxy all provider messages to terminal
        this.toolProvider.onMessage((msg) => {
            if (this.isDisabled) return;
            return this.fire(msg);
        });

        this.isDisabled = false;
    }

    abstract getName(): string;

    abstract getWorkerOptions(project: Project, targetId: string): WorkerOptions;

    abstract getWorkerSteps(workerOptions: WorkerOptions): WorkerOptions['steps'];

    abstract getInputFiles(workerOptions: WorkerOptions): TaskIOFile[];

    abstract getOutputFiles(workerOptions: WorkerOptions): TaskIOFile[];

    abstract handleStart(project: Project): Promise<void>;

    abstract handleEnd(project: Project, workerOptions: WorkerOptions, outputFiles: TaskOutputFile[]): Promise<void>;

    async handleStepStart(_project: Project, _workerOptions: WorkerOptions, _step: WorkerStep): Promise<void> {}

    async handleStepEnd(_project: Project, _workerOptions: WorkerOptions, _step: WorkerStep): Promise<void> {}

    async execute(project: Project, targetId: string): Promise<WorkerOptions> {
        const target = project.getTarget(targetId);
        if (!target) {
            throw new Error(`Target with ID ${targetId} not found!`);
        }

        const workerOptions = this.getWorkerOptions(project, targetId);

        const steps = this.getWorkerSteps(workerOptions);
        const inputFiles = getTaskFilePaths(this.getInputFiles(workerOptions), workerOptions.target.directory);
        const outputFiles = getTaskFilePaths(this.getOutputFiles(workerOptions), workerOptions.target.directory);

        // Pretty-print input files and their contents (if generated)
        this.println('Input files:', undefined, AnsiModifier.BOLD);
        for (const inputFile of inputFiles) {
            this.println(' '.repeat(2) + inputFile.path + (inputFile.data ? ':' : ''));
            if (!inputFile.data) continue;

            for (const line of decodeText(inputFile.data).split('\n')) {
                this.println(' '.repeat(4) + line.trimEnd());
            }
        }
        this.println();

        // Pretty-print output files
        this.println('Output files:', undefined, AnsiModifier.BOLD);
        for (const outputFile of outputFiles) {
            this.println(' '.repeat(2) + outputFile.path);
        }
        this.println();

        this.toolProvider.setRunContext({
            project,
            target,
            steps,
            inputFiles,
            outputFiles
        });

        // Print the tool provider and command to execute
        const toolName = await this.toolProvider.getName();
        this.println(`Task commands (${toolName}):`, undefined, AnsiModifier.BOLD);
        for (const step of steps) {
            this.println(`  ${step.tool} ${step.arguments.join(' ')}`);
        }
        this.println();

        // Execute
        await this.toolProvider.execute(async (event, step) => {
            if (event === 'start') {
                this.println(
                    `=== Execute command: '${step.tool} ${step.arguments.join(' ')}' ===`,
                    undefined,
                    AnsiModifier.BOLD
                );
                await this.handleStepStart(project, workerOptions, step);
            } else if (event === 'end') {
                this.println(`=== Command finished ===`, undefined, AnsiModifier.BOLD);
                this.println();
                await this.handleStepEnd(project, workerOptions, step);
            }
        });

        return workerOptions;
    }

    cleanup() {
        this.isDisabled = true;
    }
}
