import {type FlasherWorkerOptions, type WorkerStep, getFlasherWorkerOptions} from 'edacation';
import type * as vscode from 'vscode';

import type {Project} from '../projects/index.js';

import {AnsiModifier, type TaskOutputFile} from './messaging.js';
import {type TaskDefinition, type TaskIOFile, TerminalTask} from './task.js';
import {TaskProvider, TaskTerminal} from './terminal.js';
import {getConfiguredProvider} from './toolprovider.js';

export class FlasherTaskProvider extends TaskProvider {
    static getType() {
        return 'flasher';
    }

    getTaskType() {
        return FlasherTaskProvider.getType();
    }

    protected createTaskTerminal(
        folder: vscode.WorkspaceFolder,
        definition: TaskDefinition
    ): TaskTerminal<FlasherWorkerOptions> {
        const provider = getConfiguredProvider(this.context);
        const task = new FlasherTerminalTask(provider);

        return new TaskTerminal(this.projects, folder, definition, [task]);
    }
}

class FlasherTerminalTask extends TerminalTask<FlasherWorkerOptions> {
    getName(): string {
        return FlasherTaskProvider.getType();
    }

    getWorkerOptions(project: Project, targetId: string): FlasherWorkerOptions {
        return getFlasherWorkerOptions(project, targetId);
    }

    getWorkerSteps(workerOptions: FlasherWorkerOptions): WorkerStep[] {
        return workerOptions.steps;
    }

    getInputFiles(workerOptions: FlasherWorkerOptions): TaskIOFile[] {
        return workerOptions.inputFiles.map((path) => ({type: 'user', path}));
    }

    getOutputFiles(workerOptions: FlasherWorkerOptions): TaskIOFile[] {
        return workerOptions.outputFiles.map((path) => ({type: 'artifact', path}));
    }

    async handleStart(project: Project) {
        this.println(`Generating waveform for EDA project "${project.getName()}" using Icarus Verilog...`);
        this.println();
    }

    async handleEnd(project: Project, _workerOptions: FlasherWorkerOptions, _outputFiles: TaskOutputFile[]) {
        this.println();
        this.println(
            `Finished flashing to FPGA for EDA project "${project.getName()}" using openFPGAloader.`,
            undefined,
            AnsiModifier.GREEN
        );
        this.println();
    }
}
