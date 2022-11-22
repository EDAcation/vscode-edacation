import * as vscode from 'vscode';

import {Project} from '../projects';
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

    protected async run(project: Project) {
        this.println(`Placing and routing EDA project "${project.getName()}" using nextpnr...`);

        this.println(`Finished placing and routing EDA project "${project.getName()}" using nextpnr.`);
        this.println();

        this.exit(0);
    }
}
