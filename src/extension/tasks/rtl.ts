import {type YosysWorkerOptions, encodeText, generateYosysRTLCommands} from 'edacation';
import * as vscode from 'vscode';

import type {MessageFile} from '../../common/messages.js';
import type {Project} from '../projects/index.js';

import {type TaskOutputFile} from './messaging.js';
import {WebAssemblyTaskRunner} from './runner.js';
import {type TaskDefinition} from './task.js';
import {TaskProvider, TaskTerminal} from './terminal.js';
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
        const runner = new WebAssemblyTaskRunner(this.context);
        const task = new RTLTerminalTask(runner);

        return new TaskTerminal(this.projects, folder, definition, task);
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
            const uri = vscode.Uri.joinPath(project.getRoot(), rtlFile.path);
            vscode.commands.executeCommand('vscode.open', uri);
        }
    }
}
