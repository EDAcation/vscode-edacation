import {type NextpnrWorkerOptions, getNextpnrWorkerOptions} from 'edacation';
import * as vscode from 'vscode';

import type {Project} from '../projects/index.js';

import {AnsiModifier, type TaskOutputFile} from './messaging.js';
import {type TaskDefinition, type TaskIOFile, TerminalTask} from './task.js';
import {TaskProvider, TaskTerminal} from './terminal.js';
import {getConfiguredProvider} from './toolprovider.js';

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
        const provider = getConfiguredProvider(this.context);
        const task = new NextpnrTerminalTask(provider);

        return new TaskTerminal(this.projects, folder, definition, [task]);
    }
}

class NextpnrTerminalTask extends TerminalTask<NextpnrWorkerOptions> {
    getName(): string {
        return NextpnrTaskProvider.getType();
    }

    getWorkerOptions(project: Project, targetId: string): NextpnrWorkerOptions {
        return getNextpnrWorkerOptions(project, targetId);
    }

    getInputCommand(workerOptions: NextpnrWorkerOptions): string {
        return workerOptions.tool;
    }

    getInputArgs(workerOptions: NextpnrWorkerOptions): string[] {
        return workerOptions.arguments;
    }

    getInputFiles(workerOptions: NextpnrWorkerOptions): TaskIOFile[] {
        return workerOptions.inputFiles.map((path) => ({type: 'artifact', path}));
    }

    getOutputFiles(workerOptions: NextpnrWorkerOptions): TaskIOFile[] {
        return workerOptions.outputFiles.map((path) => ({type: 'artifact', path}));
    }

    protected println(line = '', stream: 'stdout' | 'stderr' = 'stdout', modifier?: AnsiModifier) {
        // Force informational messages to go to stdout
        if (line.toLowerCase().startsWith('info:')) {
            return super.println(line, 'stdout');
        }
        return super.println(line, stream, modifier);
    }

    async handleStart(project: Project) {
        this.println(`Placing and routing EDA project "${project.getName()}" using nextpnr...`);
        this.println('NOTE: nextpnr startup may take a while.');
        this.println();
    }

    async handleEnd(project: Project, outputFiles: TaskOutputFile[]) {
        this.println();
        this.println(
            `Finished placing and routing EDA project "${project.getName()}" using nextpnr.`,
            undefined,
            AnsiModifier.GREEN
        );
        this.println();

        // Open placed and routed file in nextpnr editor
        const pnrFile = outputFiles.find((file) => file.path === 'routed.nextpnr.json');
        if (pnrFile) {
            const uri = vscode.Uri.joinPath(project.getRoot(), pnrFile.path);
            await vscode.commands.executeCommand('vscode.open', uri);
        }
    }
}
