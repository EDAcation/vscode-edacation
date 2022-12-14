import * as vscode from 'vscode';

import {MessageFile} from '../messages';
import {Project, ProjectFile} from '../projects';
import {generateYosysRTLCommands, generateYosysSynthCommands} from '../projects/yosys';
import {encodeText} from '../util';
import {WorkerOutputFile, WorkerTaskDefinition, WorkerTaskProvider, WorkerTaskTerminal} from './worker';

export class YosysRTLTaskProvider extends WorkerTaskProvider {

    static getType() {
        return 'yosys-rtl';
    }

    getTaskType() {
        return YosysRTLTaskProvider.getType();
    }

    protected createTaskTerminal(folder: vscode.WorkspaceFolder, definition: WorkerTaskDefinition): WorkerTaskTerminal {
        return new YosysRTLTaskTerminal(this.context, this.projects, folder, definition);
    }
}

abstract class YosysTaskTerminal extends WorkerTaskTerminal {

    private lastLogMessage?: string;

    protected getWorkerName(): string {
        return 'yosys';
    }

    protected getWorkerFileName(): string {
        return 'yosys.js';
    }

    protected getInputCommand(_project: Project): string {
        return 'yosys';
    }

    protected getInputArgs(_project: Project): string[] {
        return ['design.ys'];
    }

    protected getInputFilesFromOutput(_project: Project): ProjectFile[] {
        return [];
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

class YosysRTLTaskTerminal extends YosysTaskTerminal {

    protected getInputFiles(project: Project): MessageFile[] {
        const commandsGenerated = generateYosysRTLCommands(project.getInputFiles().map((file) => file.path));

        return [{
            path: 'design.ys',
            data: encodeText(commandsGenerated.join('\r\n'))
        }];
    }

    protected getOutputFiles(_project: Project): string[] {
        return [
            'rtl.digitaljs.json'
        ];
    }

    protected async handleEnd(project: Project, outputFiles: WorkerOutputFile[]) {
        super.handleEnd(project, outputFiles);

        // Open RTL file in DigitalJS editor
        const rtlFile = outputFiles.find((file) => file.path.endsWith('rtl.digitaljs.json'));
        if (rtlFile) {
            vscode.commands.executeCommand('vscode.open', rtlFile.uri);
        }
    }
}

export class YosysSynthTaskProvider extends WorkerTaskProvider {

    static getType() {
        return 'yosys-synth';
    }

    getTaskType() {
        return YosysSynthTaskProvider.getType();
    }

    protected createTaskTerminal(folder: vscode.WorkspaceFolder, definition: WorkerTaskDefinition): WorkerTaskTerminal {
        return new YosysSynthTaskTerminal(this.context, this.projects, folder, definition);
    }
}

class YosysSynthTaskTerminal extends YosysTaskTerminal {

    protected getInputFiles(project: Project): MessageFile[] {
        const commandsGenerated = generateYosysSynthCommands(project.getInputFiles().map((file) => file.path));

        return [{
            path: 'design.ys',
            data: encodeText(commandsGenerated.join('\r\n'))
        }];
    }

    protected getOutputFiles(_project: Project): string[] {
        return [
            'ecp5.json',
            'luts.digitaljs.json',
            'rtl.digitaljs.json'
        ];
    }

    protected async handleEnd(project: Project, outputFiles: WorkerOutputFile[]) {
        super.handleEnd(project, outputFiles);

        // Open LUT file in DigitalJS editor
        const lutFile = outputFiles.find((file) => file.path.endsWith('luts.digitaljs.json'));
        if (lutFile) {
            vscode.commands.executeCommand('vscode.open', lutFile.uri);
        }
    }
}
