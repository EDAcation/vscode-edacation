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

    protected async run(project: Project) {
        this.println(`Synthesizing EDA project "${project.getName()}" using Yosys...`);

        const worker = new Worker(vscode.Uri.joinPath(this.context.extensionUri, 'workers', 'dist', 'yosys.js').toString(true));
        worker.addEventListener('message', (event) => {
            console.log('worker message', event.data);
        });
        worker.addEventListener('messageerror', (event) => {
            console.error('worker messageerror', event.data);
        });
        worker.addEventListener('error', (event) => {
            console.error('worker error', event.error);
        });

        worker.postMessage({
            type: 'input'
        });

        this.println(`Finished synthesizing EDA project "${project.getName()}" using Yosys.`);
        this.println();

        this.exit(0);
    }
}
