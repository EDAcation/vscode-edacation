import {type YosysWorkerOptions, encodeText, generateYosysRTLCommands} from 'edacation';
import * as vscode from 'vscode';

import type {MessageFile} from '../../common/messages.js';
import type {Project} from '../projects/index.js';

import {type TaskOutputFile} from './task.js';
import {type TaskDefinition, TaskProvider, TaskTerminal} from './terminal.js';
import {BaseYosysTerminalTask} from './yosys.js';

export class RTLTaskProvider extends TaskProvider {
    static getType() {
        return 'rtl';
    }

    getTaskType() {
        return RTLTaskProvider.getType();
    }

    protected createTaskTerminal(
        folder: vscode.WorkspaceFolder,
        definition: TaskDefinition
    ): TaskTerminal<YosysWorkerOptions> {
        const task = new RTLTerminalTask();

        return new TaskTerminal(this.context, this.projects, folder, definition, task);
    }
}

class RTLTerminalTask extends BaseYosysTerminalTask {
    getGeneratedInputFiles(workerOptions: YosysWorkerOptions): MessageFile[] {
        const commandsGenerated = generateYosysRTLCommands(workerOptions.inputFiles);

        return [
            {
                path: 'design.ys',
                data: encodeText(commandsGenerated.join('\r\n'))
            }
        ];
    }

    getOutputFiles(_workerOptions: YosysWorkerOptions): string[] {
        return ['rtl.digitaljs.json'];
    }

    async handleEnd(project: Project, outputFiles: TaskOutputFile[]) {
        super.handleEnd(project, outputFiles);

        // Open RTL file in DigitalJS editor
        const rtlFile = outputFiles.find((file) => file.path.endsWith('rtl.digitaljs.json'));
        if (rtlFile) {
            vscode.commands.executeCommand('vscode.open', rtlFile.uri);
        }
    }
}
