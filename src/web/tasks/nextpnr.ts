import path from 'path';
import * as vscode from 'vscode';

import {MessageFile} from '../messages';
import {Project, ProjectFile} from '../projects';
import {WorkerTaskDefinition, WorkerTaskProvider, WorkerTaskTerminal} from './worker';

export class NextpnrTaskProvider extends WorkerTaskProvider {

    static getType() {
        return 'nextpnr';
    }

    getTaskType() {
        return NextpnrTaskProvider.getType();
    }

    protected createTaskTerminal(folder: vscode.WorkspaceFolder, definition: WorkerTaskDefinition): WorkerTaskTerminal {
        return new NextpnrTaskTerminal(this.context, this.projects, folder, definition);
    }
}

class NextpnrTaskTerminal extends WorkerTaskTerminal {

    protected getWorkerName(): string {
        return NextpnrTaskProvider.getType();
    }

    protected getWorkerFileName(): string {
        return 'nextpnr.js';
    }

    protected getInputCommand(_project: Project): string {
        // TODO: choose based on architecture
        return 'nextpnr-ecp5';
    }

    private getInputFile(project: Project): ProjectFile | undefined {
        const jsonFiles = project.getOutputFiles()
            .filter((file) => path.extname(file.path) === '.json' && !file.path.endsWith('.digitaljs.json') && !file.path.endsWith('.nextpnr.json'));

        // TODO: select JSON file based on architecture

        return jsonFiles.length === 0 ? undefined : jsonFiles[0];
    }

    protected getInputArgs(project: Project): string[] {
        const inputFile = this.getInputFile(project);

        // ice40 args:
        // '--lp384',
        // '--package', 'qn32',

        return [
            // ECP5
            '--25k',
            '--package', 'CABGA381',
            '--json', inputFile ? inputFile.path : 'missing.json',
            '--write', 'routed.nextpnr.json',
            '--placed-svg', 'placed.svg',
            '--routed-svg', 'routed.svg'
        ];
    }

    protected getInputFiles(_project: Project): MessageFile[] {
        return [];
    }

    protected getInputFilesFromOutput(project: Project): ProjectFile[] {
        const inputFile = this.getInputFile(project);
        return inputFile ? [inputFile] : [];
    }

    protected getOutputFiles(_project: Project): string[] {
        return [
            'routed.nextpnr.json',
            'placed.svg',
            'routed.svg'
        ];
    }

    protected async handleStart(project: Project) {
        this.println(`Placing and routing EDA project "${project.getName()}" using nextpnr...`);
        this.println('NOTE: nextpnr startup may take a while. This will be improved in future versions of this extension.');
        this.println();
    }

    protected async handleEnd(project: Project, outputFiles: ProjectFile[]) {
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
