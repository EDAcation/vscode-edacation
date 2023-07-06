import {type YosysWorkerOptions, getYosysWorkerOptions} from 'edacation';
import * as vscode from 'vscode';

import type {MessageFile} from '../../common/messages.js';
import type {Project} from '../projects/index.js';
import {encodeText} from '../util.js';

import {type WorkerOutputFile, type WorkerTaskDefinition, WorkerTaskProvider, WorkerTaskTerminal} from './worker.js';

export abstract class BaseYosysTaskTerminal extends WorkerTaskTerminal<YosysWorkerOptions> {
    private lastLogMessage?: string;

    protected getWorkerName(): string {
        return 'yosys';
    }

    protected getWorkerFileName(): string {
        return 'yosys.js';
    }

    protected getWorkerOptions(project: Project, targetId: string): YosysWorkerOptions {
        return getYosysWorkerOptions(project, targetId);
    }

    protected getInputCommand(workerOptions: YosysWorkerOptions): string {
        return workerOptions.tool;
    }

    protected getInputArgs(_workerOptions: YosysWorkerOptions): string[] {
        return ['design.ys'];
    }

    protected getInputFiles(workerOptions: YosysWorkerOptions): string[] {
        return workerOptions.inputFiles;
    }

    protected getGeneratedInputFiles(workerOptions: YosysWorkerOptions): MessageFile[] {
        return [
            {
                path: 'design.ys',
                data: encodeText(workerOptions.commands.join('\r\n'))
            }
        ];
    }

    protected getOutputFiles(workerOptions: YosysWorkerOptions): string[] {
        return workerOptions.outputFiles;
    }

    protected println(line?: string) {
        // Ignore duplicate lines, but allow repeated prints
        if (this.lastLogMessage === line) {
            this.lastLogMessage = undefined;
            return;
        } else {
            this.lastLogMessage = line;
        }

        super.println(line);
    }

    protected async handleStart(project: Project) {
        this.println(`Synthesizing EDA project "${project.getName()}" using Yosys...`);
        this.println();
    }

    protected async handleEnd(project: Project, _outputFiles: WorkerOutputFile[]) {
        this.println();
        this.println(`Finished synthesizing EDA project "${project.getName()}" using Yosys.`);
        this.println();
    }
}

export class YosysTaskProvider extends WorkerTaskProvider {
    static getType() {
        return 'yosys';
    }

    getTaskType() {
        return YosysTaskProvider.getType();
    }

    protected createTaskTerminal(
        folder: vscode.WorkspaceFolder,
        definition: WorkerTaskDefinition
    ): WorkerTaskTerminal<YosysWorkerOptions> {
        return new YosysTaskTerminal(this.context, this.projects, folder, definition);
    }
}

class YosysTaskTerminal extends BaseYosysTaskTerminal {
    protected async handleEnd(project: Project, outputFiles: WorkerOutputFile[]) {
        super.handleEnd(project, outputFiles);

        // Open LUT file in DigitalJS editor
        const lutFile = outputFiles.find((file) => file.path.endsWith('luts.digitaljs.json'));
        if (lutFile) {
            vscode.commands.executeCommand('vscode.open', lutFile.uri);
        }
    }
}
