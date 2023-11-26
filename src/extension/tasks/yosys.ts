import {type YosysWorkerOptions, getYosysWorkerOptions} from 'edacation';
import * as vscode from 'vscode';

import type {MessageFile} from '../../common/messages.js';
import type {Project} from '../projects/index.js';
import {encodeText} from '../util.js';

import {AnsiModifier, type TaskOutputFile} from './messaging.js';
import {getConfiguredRunner} from './runner.js';
import {type TaskDefinition, TerminalTask} from './task.js';
import {TaskProvider, TaskTerminal} from './terminal.js';

export abstract class BaseYosysTerminalTask extends TerminalTask<YosysWorkerOptions> {
    private lastLogMessage?: string;

    getName(): string {
        return 'yosys';
    }

    getWorkerFileName(): string {
        return 'yosys.js';
    }

    getWorkerOptions(project: Project, targetId: string): YosysWorkerOptions {
        return getYosysWorkerOptions(project, targetId);
    }

    getInputCommand(workerOptions: YosysWorkerOptions): string {
        return workerOptions.tool;
    }

    getInputArgs(_workerOptions: YosysWorkerOptions): string[] {
        return ['design.ys'];
    }

    getInputFiles(workerOptions: YosysWorkerOptions): string[] {
        return workerOptions.inputFiles;
    }

    getGeneratedInputFiles(workerOptions: YosysWorkerOptions): MessageFile[] {
        return [
            {
                path: 'design.ys',
                data: encodeText(workerOptions.commands.join('\r\n'))
            }
        ];
    }

    getOutputFiles(workerOptions: YosysWorkerOptions): string[] {
        return workerOptions.outputFiles;
    }

    protected println(line?: string, stream: 'stdout' | 'stderr' = 'stdout', modifier?: AnsiModifier) {
        // Ignore duplicate lines, but allow repeated prints
        if (this.lastLogMessage === line) {
            this.lastLogMessage = undefined;
            return;
        } else {
            this.lastLogMessage = line;
        }

        super.println(line, stream, modifier);
    }

    async handleStart(project: Project) {
        this.println(`Synthesizing EDA project "${project.getName()}" using Yosys...`);
        this.println();
    }

    async handleEnd(project: Project, _outputFiles: TaskOutputFile[]) {
        this.println();
        this.println(
            `Finished synthesizing EDA project "${project.getName()}" using Yosys.`,
            undefined,
            AnsiModifier.GREEN
        );
        this.println();
    }
}

export class YosysTaskProvider extends TaskProvider {
    static getType() {
        return 'yosys';
    }

    getTaskType() {
        return YosysTaskProvider.getType();
    }

    protected createTaskTerminal(
        folder: vscode.WorkspaceFolder,
        definition: TaskDefinition
    ): TaskTerminal<YosysWorkerOptions> {
        const runner = getConfiguredRunner(this.context);
        const task = new YosysTerminalTask(runner);

        return new TaskTerminal(this.projects, folder, definition, task);
    }
}

class YosysTerminalTask extends BaseYosysTerminalTask {
    async handleEnd(project: Project, outputFiles: TaskOutputFile[]) {
        await super.handleEnd(project, outputFiles);

        // Open LUT file in DigitalJS editor
        const lutFile = outputFiles.find((file) => file.path.endsWith('luts.digitaljs.json'));
        if (lutFile) {
            const uri = vscode.Uri.joinPath(project.getRoot(), lutFile.path);
            await vscode.commands.executeCommand('vscode.open', uri);
        }
    }
}
