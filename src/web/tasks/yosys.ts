import * as vscode from 'vscode';

import {Project} from '../projects';
import {WorkerTaskDefinition, WorkerTaskProvider, WorkerTaskTerminal} from './worker';

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

    protected async handleStart(project: Project) {
        this.println(`Synthesizing EDA project "${project.getName()}" using Yosys...`);
    }

    protected async handleEnd(project: Project) {
        this.println(`Finished synthesizing EDA project "${project.getName()}" using Yosys.`);
        this.println();
    }
}
