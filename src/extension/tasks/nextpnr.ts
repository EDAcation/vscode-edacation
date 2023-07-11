import {type NextpnrWorkerOptions, getNextpnrWorkerOptions} from 'edacation';
import * as vscode from 'vscode';

import type {MessageFile} from '../../common/messages.js';
import type {Project, ProjectFile} from '../projects/index.js';

import {TerminalTask} from './task.js';
import {type TaskDefinition, TaskProvider, TaskTerminal} from './terminal.js';

export class NextpnrTaskProvider extends TaskProvider {
    static getType() {
        return 'nextpnr';
    }

    getTaskType() {
        return NextpnrTaskProvider.getType();
    }

    protected createTaskTerminal(
        folder: vscode.WorkspaceFolder,
        definition: TaskDefinition
    ): TaskTerminal<NextpnrWorkerOptions> {
        const task = new NextpnrTerminalTask();

        return new TaskTerminal(this.context, this.projects, folder, definition, task);
    }
}

class NextpnrTerminalTask extends TerminalTask<NextpnrWorkerOptions> {
    getName(): string {
        return NextpnrTaskProvider.getType();
    }

    getWorkerOptions(project: Project, targetId: string): NextpnrWorkerOptions {
        return getNextpnrWorkerOptions(project, targetId);
    }

    getWorkerFileName(workerOptions: NextpnrWorkerOptions): string {
        return `${workerOptions.tool}.js`;
    }

    getInputCommand(workerOptions: NextpnrWorkerOptions): string {
        return workerOptions.tool;
    }

    getInputArgs(workerOptions: NextpnrWorkerOptions): string[] {
        return workerOptions.arguments;
    }

    getInputFiles(workerOptions: NextpnrWorkerOptions): string[] {
        return workerOptions.inputFiles;
    }

    getGeneratedInputFiles(_workerOptions: NextpnrWorkerOptions): MessageFile[] {
        return [];
    }

    getOutputFiles(workerOptions: NextpnrWorkerOptions): string[] {
        return workerOptions.outputFiles;
    }

    async handleStart(project: Project) {
        this.println(`Placing and routing EDA project "${project.getName()}" using nextpnr...`);
        this.println(
            'NOTE: nextpnr startup may take a while. This will be improved in future versions of this extension.'
        );
        this.println();
    }

    async handleEnd(project: Project, outputFiles: ProjectFile[]) {
        this.println();
        this.println(`Finished placing and routing EDA project "${project.getName()}" using nextpnr.`);
        this.println();

        // Open placed and routed file in nextpnr editor
        const pnrFile = outputFiles.find((file) => file.path === 'routed.nextpnr.json');
        if (pnrFile) {
            vscode.commands.executeCommand('vscode.open', pnrFile.uri);
        }
    }
}