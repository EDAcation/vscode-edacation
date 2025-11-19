import {type IVerilogWorkerOptions, type WorkerStep, getIVerilogWorkerOptions} from 'edacation';
import {getTargetFile} from 'edacation/dist/project/target';
import * as vscode from 'vscode';
import {Utils} from 'vscode-uri';

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
        const task = new IVerilogTerminalTask(provider);

        return new TaskTerminal(this.projects, folder, definition, task);
    }
}

class IVerilogTerminalTask extends TerminalTask<IVerilogWorkerOptions> {
    getName(): string {
        return IVerilogTaskProvider.getType();
    }

    getWorkerOptions(project: Project, targetId: string): IVerilogWorkerOptions {
        return getIVerilogWorkerOptions(project, targetId);
    }

    getWorkerSteps(workerOptions: IVerilogWorkerOptions): WorkerStep[] {
        return workerOptions.steps;
    }

    getInputFiles(workerOptions: IVerilogWorkerOptions): TaskIOFile[] {
        return workerOptions.inputFiles.map((path) => ({type: 'user', path}));
    }

    getOutputFiles(workerOptions: IVerilogWorkerOptions): TaskIOFile[] {
        return workerOptions.outputFiles.map((path) => ({type: 'artifact', path}));
    }

    async handleStart(project: Project) {
        this.println(`Generating waveform for EDA project "${project.getName()}" using Icarus Verilog...`);
        this.println();
    }

    async handleEnd(project: Project, workerOptions: IVerilogWorkerOptions, outputFiles: TaskOutputFile[]) {
        this.println();
        this.println(
            `Finished generating waveform for EDA project "${project.getName()}" using Icarus Verilog.`,
            undefined,
            AnsiModifier.GREEN
        );
        this.println();

        const vcdFile = outputFiles.find((file) => file.path.endsWith('.vcd'));
        if (!vcdFile || !vcdFile.uri) return;

        // VPP places the file in the root directory with no real way to configure this,
        // so we move it to its respective target directory first
        const vcdFileName = Utils.basename(vcdFile.uri);
        const oldUri = project.getFileUri(vcdFileName);
        const newUri = project.getFileUri(getTargetFile(workerOptions.target, vcdFileName));

        try {
            await vscode.workspace.fs.rename(oldUri, newUri, {overwrite: true});
        } catch {
            this.warn('Could not auto-detect the VCD file, so it could not be post-processed.');
            this.warn(
                "Your VCD may have ended up in the project root. It will not be added to EDAcation's output file list,"
            );
            this.warn('and will not be opened automatically in the waveform viewer.\n');

            this.warn('In order to fix this, instruct the testbench to dump to a file named "<tb name>.vcd".');
            this.warn('e.g., for a testbench named "testbench.v", write to a file named "testbench.vcd".');
            return;
        }

        // Open file in editor
        await vscode.commands.executeCommand('vscode.open', newUri);
    }
}
