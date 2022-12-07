import path from 'path';
import * as vscode from 'vscode';

import {MessageFile} from '../messages';
import {Project} from '../projects';
import {encodeText, FILE_EXTENSIONS_VERILOG} from '../util';
import {WorkerOutputFile, WorkerTaskDefinition, WorkerTaskProvider, WorkerTaskTerminal} from './worker';

export class YosysTaskProvider extends WorkerTaskProvider {

    static getType() {
        return 'yosys';
    }

    getTaskType() {
        return YosysTaskProvider.getType();
    }

    protected createTaskTerminal(folder: vscode.WorkspaceFolder, definition: WorkerTaskDefinition): WorkerTaskTerminal {
        return new YosysTaskTerminal(this.context, this.projects, folder, definition);
    }
}

class YosysTaskTerminal extends WorkerTaskTerminal {

    protected getWorkerName() {
        return YosysTaskProvider.getType();
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
                'write_json rtl.djson',
                'synth -lut 4',
                'write_json luts.djson',
                'synth_ecp5 -json ecp5.json;',
                ''
            ].join('\n'))
        }];
    }

    protected getOutputFiles(_project: Project): string[] {
        return [
            'ecp5.json',
            'luts.djson',
            'rtl.djson'
        ];
    }

    protected async handleStart(project: Project) {
        this.println(`Synthesizing EDA project "${project.getName()}" using Yosys...`);
        this.println();
    }

    protected async handleEnd(project: Project, outputFiles: WorkerOutputFile[]) {
        this.println();
        this.println(`Finished synthesizing EDA project "${project.getName()}" using Yosys.`);
        this.println();

        // Open RTL file in DigitalJS editor
        const rtlFile = outputFiles.find((file) => file.path === 'rtl.djson');
        if (rtlFile) {
            vscode.commands.executeCommand('vscode.open', rtlFile.uri);
        }
    }
}
