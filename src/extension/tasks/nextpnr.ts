import {type NextpnrWorkerOptions, VENDORS, WorkerStep, getNextpnrWorkerOptions} from 'edacation';
import * as vscode from 'vscode';

import type {Project} from '../projects/index.js';
import {decodeJSON, encodeJSON} from '../util.js';

import {AnsiModifier, type TaskOutputFile, type TerminalMessage} from './messaging.js';
import {type TaskDefinition, type TaskIOFile, TerminalTask} from './task.js';
import {TaskProvider, TaskTerminal} from './terminal.js';
import {getConfiguredProvider} from './toolprovider.js';

export class NextpnrTaskProvider extends TaskProvider {
    static getType() {
        return 'nextpnr';
    }

    getTaskType() {
        return NextpnrTaskProvider.getType();
    }

    protected createTaskTerminal(
        folder: vscode.WorkspaceFolder,
        definition: TaskDefinition
    ): TaskTerminal<NextpnrWorkerOptions> {
        const provider = getConfiguredProvider(this.context);
        const task = new NextpnrTerminalTask(provider);

        return new TaskTerminal(this.projects, folder, definition, [task]);
    }
}

class NextpnrTerminalTask extends TerminalTask<NextpnrWorkerOptions> {
    getName(): string {
        return NextpnrTaskProvider.getType();
    }

    getWorkerOptions(project: Project, targetId: string): NextpnrWorkerOptions {
        return getNextpnrWorkerOptions(project, targetId);
    }

    getWorkerSteps(workerOptions: NextpnrWorkerOptions): WorkerStep[] {
        return workerOptions.steps;
    }

    getInputFiles(workerOptions: NextpnrWorkerOptions): TaskIOFile[] {
        return workerOptions.inputFiles.map((path) => ({type: 'artifact', path}));
    }

    getOutputFiles(workerOptions: NextpnrWorkerOptions): TaskIOFile[] {
        return workerOptions.outputFiles.map((path) => ({type: 'artifact', path}));
    }

    protected fire(message: TerminalMessage) {
        // Force informational messages to go to stdout
        if (message.type === 'println' && message.line?.toLowerCase().startsWith('info: ')) {
            if (message.line) message.line = message.line.slice(6); // slice off "info: "
            message.stream = 'stdout';
        }
        return super.fire(message);
    }

    async handleStart(project: Project) {
        this.println(`Placing and routing EDA project "${project.getName()}" using nextpnr...`);
        this.println('NOTE: nextpnr startup may take a while.');
        this.println();
    }

    async handleEnd(project: Project, workerOptions: NextpnrWorkerOptions, outputFiles: TaskOutputFile[]) {
        this.println();
        this.println(
            `Finished placing and routing EDA project "${project.getName()}" using nextpnr.`,
            undefined,
            AnsiModifier.GREEN
        );
        this.println();

        const pnrFile = outputFiles.find((file) => file.path.endsWith('routed.nextpnr.json'));
        if (!pnrFile) return;
        const uri = project.getFileUri(pnrFile.path);

        const target = workerOptions.target;
        const deviceName = VENDORS[target.vendor]?.families[target.family].devices[target.device].device;

        this.println('Updating output file...');
        const oldContent = await vscode.workspace.fs.readFile(uri);
        const newContent = encodeJSON({
            chip: {
                family: target.family,
                device: deviceName
            },
            data: decodeJSON(oldContent)
        });
        await vscode.workspace.fs.writeFile(uri, newContent);
        this.println('Done.');

        // Open file in nextpnr editor
        await vscode.commands.executeCommand('vscode.open', uri);
    }
}
