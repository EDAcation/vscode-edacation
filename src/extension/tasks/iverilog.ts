import {type IVerilogWorkerOptions, WorkerStep, getIVerilogWorkerOptions} from 'edacation';
import * as vscode from 'vscode';

import type {Project} from '../projects/index.js';

import {AnsiModifier, type TaskOutputFile} from './messaging.js';
import {type TaskDefinition, type TaskIOFile, TerminalTask} from './task.js';
import {TaskProvider, TaskTerminal} from './terminal.js';
import {getConfiguredProvider} from './toolprovider.js';

export class IVerilogTaskProvider extends TaskProvider {
    static getType() {
        return 'iverilog';
    }

    getTaskType() {
        return IVerilogTaskProvider.getType();
    }

    protected createTaskTerminal(
        folder: vscode.WorkspaceFolder,
        definition: TaskDefinition
    ): TaskTerminal<IVerilogWorkerOptions> {
        const provider = getConfiguredProvider(this.context);
        const task = new NextpnrTerminalTask(provider);

        return new TaskTerminal(this.projects, folder, definition, [task]);
    }
}

class NextpnrTerminalTask extends TerminalTask<IVerilogWorkerOptions> {
    getName(): string {
        return IVerilogTaskProvider.getType();
    }

    getWorkerOptions(project: Project, targetId: string): IVerilogWorkerOptions {
        // TODO: properly integrate this
        const testbenches = project.getInputFileUris().filter((f) => f.path.endsWith('_tb.v'));
        if (testbenches.length === 0) throw new Error('No testbench files!');
        return getIVerilogWorkerOptions(project, targetId, '');
    }

    getWorkerSteps(workerOptions: IVerilogWorkerOptions): WorkerStep[] {
        return workerOptions.steps;
    }

    getInputFiles(workerOptions: IVerilogWorkerOptions): TaskIOFile[] {
        return workerOptions.inputFiles.map((path) => ({type: 'artifact', path}));
    }

    getOutputFiles(workerOptions: IVerilogWorkerOptions): TaskIOFile[] {
        return workerOptions.outputFiles.map((path) => ({type: 'artifact', path}));
    }

    async handleStart(project: Project) {
        this.println(`Generating waveform for EDA project "${project.getName()}" using Icarus Verilog...`);
        this.println();
    }

    async handleEnd(project: Project, _workerOptions: IVerilogWorkerOptions, outputFiles: TaskOutputFile[]) {
        this.println();
        this.println(
            `Finished generating waveform for EDA project "${project.getName()}" using Icarus Verilog.`,
            undefined,
            AnsiModifier.GREEN
        );
        this.println();

        const vddFile = outputFiles.find((file) => file.path.endsWith('.vdd'));
        if (!vddFile) return;
        const uri = vscode.Uri.joinPath(project.getRoot(), vddFile.path);

        // Open file in editor
        await vscode.commands.executeCommand('vscode.open', uri);
    }
}
