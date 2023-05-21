import * as vscode from 'vscode';

import {Project, ProjectFile} from '../projects';
import {WorkerTaskDefinition, WorkerTaskProvider, WorkerTaskTerminal} from './worker';
import {NextpnrWorkerOptions, getNextpnrWorkerOptions} from 'edacation';
import {MessageFile} from '../messages';

export class NextpnrTaskProvider extends WorkerTaskProvider {

    static getType() {
        return 'nextpnr';
    }

    getTaskType() {
        return NextpnrTaskProvider.getType();
    }

    protected createTaskTerminal(folder: vscode.WorkspaceFolder, definition: WorkerTaskDefinition): WorkerTaskTerminal<NextpnrWorkerOptions> {
        return new NextpnrTaskTerminal(this.context, this.projects, folder, definition);
    }
}

class NextpnrTaskTerminal extends WorkerTaskTerminal<NextpnrWorkerOptions> {

    protected getWorkerName(): string {
        return NextpnrTaskProvider.getType();
    }

    protected getWorkerOptions(project: Project, targetId: string): NextpnrWorkerOptions {
        return getNextpnrWorkerOptions(project, targetId);
    }

    protected getWorkerFileName(workerOptions: NextpnrWorkerOptions): string {
        return `${workerOptions.tool}.js`;
    }

    protected getInputCommand(workerOptions: NextpnrWorkerOptions): string {
        return workerOptions.tool;
    }

    protected getInputArgs(workerOptions: NextpnrWorkerOptions): string[] {
        return workerOptions.arguments;
    }

    protected getInputFiles(workerOptions: NextpnrWorkerOptions): string[] {
        return workerOptions.inputFiles;
    }

    protected getGeneratedInputFiles(_workerOptions: NextpnrWorkerOptions): MessageFile[] {
        return [];
    }

    protected getOutputFiles(workerOptions: NextpnrWorkerOptions): string[] {
        return workerOptions.outputFiles;
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
