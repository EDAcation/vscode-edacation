import * as vscode from 'vscode';

import {MessageFile} from '../messages';
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

    protected getWorkerName() {
        return NextpnrTaskProvider.getType();
    }

    protected getWorkerFileName() {
        return 'nextpnr.js';
    }

    protected getInputArgs(_project: Project): string[] {
        // TODO: luts.json input isn't in included in project files right now
        return [
            '--lp384',
            '--package', 'qn32',
            '--json', 'luts.json',
            '--write', 'routed.json',
            '--placed-svg', 'placed.svg',
            '--routed-svg', 'routed.svg'
        ];
    }

    protected getInputFiles(_project: Project): MessageFile[] {
        return [];
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
    }

    protected async handleEnd(project: Project) {
        this.println(`Finished placing and routing EDA project "${project.getName()}" using nextpnr.`);
        this.println();
    }
}
