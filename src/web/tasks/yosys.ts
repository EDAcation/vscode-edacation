import path from 'path';
import * as vscode from 'vscode';

import {MessageFile} from '../messages';
import {Project, ProjectFile} from '../projects';
import {encodeText, FILE_EXTENSIONS_VERILOG} from '../util';
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

class YosysRTLTaskTerminal extends WorkerTaskTerminal {

    protected getWorkerName() {
        return 'yosys';
    }

    protected getWorkerFileName() {
        return 'yosys.js';
    }

    protected getInputArgs(_project: Project): string[] {
        return ['design.ys'];
    }

    protected getInputFiles(project: Project): MessageFile[] {
        const verilogFiles = project.getInputFiles().filter((file) => FILE_EXTENSIONS_VERILOG.includes(path.extname(file.path).substring(1)));

        return [{
            path: 'design.ys',
            data: encodeText([
                ...verilogFiles.map((file) => `read_verilog ${file.path}`),
                'proc;',
                'opt;',
                'show;',
                'write_json rtl.digitaljs.json',
                ''
            ].join('\n'))
        }];
    }

    protected getInputFilesFromOutput(_project: Project): ProjectFile[] {
        return [];
    }

    protected getOutputFiles(_project: Project): string[] {
        return [
            'rtl.digitaljs.json'
        ];
    }

    protected async handleStart(project: Project) {
        this.println(`Processing EDA project "${project.getName()}" using Yosys...`);
        this.println();
    }

    protected async handleEnd(project: Project, outputFiles: WorkerOutputFile[]) {
        this.println();
        this.println(`Finished processing EDA project "${project.getName()}" using Yosys.`);
        this.println();

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

class YosysSynthTaskTerminal extends WorkerTaskTerminal {

    private lastLogMessage?: string;

    protected getWorkerName() {
        return 'yosys';
    }

    protected getWorkerFileName() {
        return 'yosys.js';
    }

    protected getInputArgs(_project: Project): string[] {
        return ['design.ys'];
    }

    protected getInputFiles(project: Project): MessageFile[] {
        const verilogFiles = project.getInputFiles().filter((file) => FILE_EXTENSIONS_VERILOG.includes(path.extname(file.path).substring(1)));

        return [{
            path: 'design.ys',
            data: encodeText([
                ...verilogFiles.map((file) => `read_verilog ${file.path}`),
                'proc;',
                'opt;',
                'show;',
                'write_json rtl.digitaljs.json',
                'synth -lut 4',
                'write_json luts.digitaljs.json',
                'synth_ecp5 -json ecp5.json;',
                ''
            ].join('\n'))
        }];
    }

    protected getInputFilesFromOutput(_project: Project): ProjectFile[] {
        return [];
    }

    protected getOutputFiles(_project: Project): string[] {
        return [
            'ecp5.json',
            'luts.digitaljs.json',
            'rtl.digitaljs.json'
        ];
    }

    protected println(line?: string): void {
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

    protected async handleEnd(project: Project, outputFiles: WorkerOutputFile[]) {
        this.println();
        this.println(`Finished synthesizing EDA project "${project.getName()}" using Yosys.`);
        this.println();

        // Open LUT file in DigitalJS editor
        const lutFile = outputFiles.find((file) => file.path.endsWith('luts.digitaljs.json'));
        if (lutFile) {
            vscode.commands.executeCommand('vscode.open', lutFile.uri);
        }
    }
}
