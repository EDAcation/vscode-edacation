import {type YosysWorkerOptions, encodeText, generateYosysRTLCommands} from 'edacation';
import * as vscode from 'vscode';

import type {MessageFile} from '../messages.js';
import type {Project} from '../projects/index.js';

import {
    type WorkerOutputFile,
    type WorkerTaskDefinition,
    WorkerTaskProvider,
    type WorkerTaskTerminal
} from './worker.js';
import {BaseYosysTaskTerminal} from './yosys.js';

export class RTLTaskProvider extends WorkerTaskProvider {
    static getType() {
        return 'rtl';
    }

    getTaskType() {
        return RTLTaskProvider.getType();
    }

    protected createTaskTerminal(
        folder: vscode.WorkspaceFolder,
        definition: WorkerTaskDefinition
    ): WorkerTaskTerminal<YosysWorkerOptions> {
        return new RTLTaskTerminal(this.context, this.projects, folder, definition);
    }
}

class RTLTaskTerminal extends BaseYosysTaskTerminal {
    protected getGeneratedInputFiles(workerOptions: YosysWorkerOptions): MessageFile[] {
        const commandsGenerated = generateYosysRTLCommands(workerOptions.inputFiles);

        return [
            {
                path: 'design.ys',
                data: encodeText(commandsGenerated.join('\r\n'))
            }
        ];
    }

    protected getOutputFiles(_workerOptions: YosysWorkerOptions): string[] {
        return ['rtl.digitaljs.json'];
    }

    protected async handleEnd(project: Project, outputFiles: WorkerOutputFile[]) {
        super.handleEnd(project, outputFiles);

        // Open RTL file in DigitalJS editor
        const rtlFile = outputFiles.find((file) => file.path.endsWith('rtl.digitaljs.json'));
        if (rtlFile) {
            vscode.commands.executeCommand('vscode.open', rtlFile.uri);
        }
    }
}
