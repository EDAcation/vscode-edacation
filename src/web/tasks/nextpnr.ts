import * as vscode from 'vscode';

import {Project, Projects} from '../projects';
import {WorkerTaskDefinition, WorkerTaskProvider, WorkerTaskTerminal} from './worker';

export class NextpnrTaskProvider extends WorkerTaskProvider {

    static getType() {
        return 'nextpnr';
    }

    getTaskType() {
        return NextpnrTaskProvider.getType();
    }

    protected createTaskTerminal(projects: Projects, folder: vscode.WorkspaceFolder, definition: WorkerTaskDefinition): WorkerTaskTerminal {
        return new NextpnrTaskTerminal(projects, folder, definition);
    }
}

class NextpnrTaskTerminal extends WorkerTaskTerminal {

    protected async run(project: Project): Promise<number> {
        this.println(`Synthesizing EDA project "${project.getName()} using Yosys..."`);

        this.println(`Finished synthesizing EDA project "${project.getName()} using Yosys."`);
        this.println();

        return 0;
    }
}
