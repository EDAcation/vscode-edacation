import * as vscode from 'vscode';

import {Project, Projects} from '../projects';
import {WorkerTaskDefinition, WorkerTaskProvider, WorkerTaskTerminal} from './worker';

export class YosysTaskProvider extends WorkerTaskProvider {

    static getType() {
        return 'yosys';
    }

    getTaskType() {
        return YosysTaskProvider.getType();
    }

    protected createTaskTerminal(projects: Projects, folder: vscode.WorkspaceFolder, definition: WorkerTaskDefinition): WorkerTaskTerminal {
        return new YosysTaskTerminal(projects, folder, definition);
    }
}

class YosysTaskTerminal extends WorkerTaskTerminal {

    protected async run(project: Project): Promise<number> {
        this.println(`Synthesizing EDA project "${project.getName()} using Yosys..."`);

        this.println(`Finished synthesizing EDA project "${project.getName()} using Yosys."`);
        this.println();

        return 0;
    }
}
