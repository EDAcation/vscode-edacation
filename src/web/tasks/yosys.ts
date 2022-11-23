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

    protected getWorkerFileName() {
        return 'yosys.js';
    }

    protected getInputArgs(_project: Project): string[] {
        return ['design.ys'];
    }

    protected getInputFiles(project: Project): MessageFile[] {
        // TODO: improve handeling of relative paths

        const verilogFiles = project.getFiles()
            .filter((file) => FILE_EXTENSIONS_VERILOG.includes(path.extname(file.path).substring(1)))
            .map((file) => file.path.replace(`${project.getRoot().path}/`, ''));

        return [{
            path: 'design.ys',
            data: encodeText([
                ...verilogFiles.map((file) => `read_verilog ${file}`),
                'proc;',
                'opt;',
                'show;',
                'synth_ecp5 -json luts.json;',
                ''
            ].join('\n'))
        }];
    }

    protected getOutputFiles(_project: Project): string[] {
        return [
            'luts.json'
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

        const lutsFile = outputFiles.find((file) => file.path === 'luts.json');
        if (lutsFile) {
            vscode.commands.executeCommand('vscode.open', lutsFile.uri);
        }
    }
}
