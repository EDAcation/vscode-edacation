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

    protected getWorkerName() {
        return NextpnrTaskProvider.getType();
    }

    protected getWorkerFileName() {
        return 'nextpnr.js';
    }

    private getInputFile(project: Project) {
        const jsonFiles = project.getOutputFiles().filter((file) => path.extname(file.path) === '.json');

        // TODO: select JSON file based on architecture

        return jsonFiles.length === 0 ? undefined : jsonFiles[0];
    }

    protected getInputArgs(project: Project): string[] {
        const inputFile = this.getInputFile(project);

        return [
            '--lp384',
            '--package', 'qn32',
            '--json', inputFile ? inputFile.path : 'missing.json',
            '--write', 'routed.json',
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
            'routed.json',
            'placed.svg',
            'routed.svg'
        ];
    }

    protected async handleStart(project: Project) {
        this.println(`Placing and routing EDA project "${project.getName()}" using nextpnr...`);
        this.println('NOTE: nextpnr startup may take a while.');
    }

    protected async handleEnd(project: Project) {
        this.println(`Finished placing and routing EDA project "${project.getName()}" using nextpnr.`);
        this.println();
    }
}
