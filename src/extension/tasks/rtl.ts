import {type YosysWorkerOptions, encodeText, generateYosysRTLCommands} from 'edacation';
import {basename} from 'path-browserify';
import * as vscode from 'vscode';
import type {Uri} from 'vscode';

import type {MessageFile} from '../../common/messages.js';
import type {Project} from '../projects/index.js';
import {decodeJSON, encodeJSON} from '../util.js';

import {type TaskOutputFile} from './messaging.js';
import {getConfiguredRunner} from './runner.js';
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
        const runner = getConfiguredRunner(this.context);
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
        return ['rtl.digitaljs.json', 'stats.digitaljs.json'];
    }

    private async updateFile(uri: vscode.Uri) {
        const fileName = basename(uri.path);
        let fileType: string;
        if (fileName === 'rtl.digitaljs.json') {
            fileType = 'rtl';
        } else if (fileName === 'stats.digitaljs.json') {
            fileType = 'stats';
        } else {
            // TODO: print the message to stderr as a warning (red text).
            // This is implemented in https://github.com/EDAcation/vscode-edacation/pull/14.
            this.println(
                `WARNING: Output file "${fileName}" not recognized. It might not be compatible with EDAcation.`
            );
            return;
        }

        // Actually update file
        const oldContent = await vscode.workspace.fs.readFile(uri);
        const newContent = encodeJSON({
            type: fileType,
            data: decodeJSON(oldContent)
        });
        await vscode.workspace.fs.writeFile(uri, newContent);
    }

    async handleEnd(project: Project, outputFiles: TaskOutputFile[]) {
        await super.handleEnd(project, outputFiles);

        // Update file contents so our custom editor can handle them
        // TODO: print the message to stderr as an error (red text).
        // This is implemented in https://github.com/EDAcation/vscode-edacation/pull/14.
        await Promise.all(
            outputFiles.map((file) =>
                this.updateFile(file.uri as Uri).catch((_err) =>
                    this.println(`Error while updating "${file.path}"; the file might not be usable!`)
                )
            )
        );

        // Open RTL file in DigitalJS editor
        const rtlFile = outputFiles.find((file) => file.path.endsWith('rtl.digitaljs.json'));
        if (rtlFile) {
            const uri = vscode.Uri.joinPath(project.getRoot(), rtlFile.path);
            await vscode.commands.executeCommand('vscode.open', uri);
        }
    }
}
