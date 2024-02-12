import {type NextpnrWorkerOptions, getNextpnrWorkerOptions} from 'edacation';
import * as vscode from 'vscode';

import type {MessageFile} from '../../common/messages.js';
import type {Project} from '../projects/index.js';

import {AnsiModifier, type TaskOutputFile} from './messaging.js';
import {getConfiguredRunner} from './runner.js';
import {type TaskDefinition, TerminalTask} from './task.js';
import {TaskProvider, TaskTerminal} from './terminal.js';

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
        const runner = getConfiguredRunner(this.context);
        const task = new NextpnrTerminalTask(runner);

        return new TaskTerminal(this.projects, folder, definition, task);
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
