import {type YosysWorkerOptions, encodeText, generateYosysRTLCommands} from 'edacation';
import {basename} from 'path-browserify';
import * as vscode from 'vscode';

import type {Project} from '../projects/index.js';
import {decodeJSON, encodeJSON} from '../util.js';

import type {TaskOutputFile} from './messaging.js';
import {getConfiguredRunner} from './runner.js';
import type {TaskDefinition, TaskIOFile} from './task.js';
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

        return new TaskTerminal(this.projects, folder, definition, [task]);
    }
}

class RTLTerminalTask extends BaseYosysTerminalTask {
    getInputFiles(workerOptions: YosysWorkerOptions): TaskIOFile[] {
        const files = super.getInputFiles(workerOptions);

        const commandsGenerated = generateYosysRTLCommands(workerOptions);
        return [
            ...files,
            {
                type: 'temp',
                path: 'design.ys',
                data: encodeText(commandsGenerated.join('\r\n'))
            }
        ];
    }

    getOutputFiles(_workerOptions: YosysWorkerOptions): TaskIOFile[] {
        return [
            {
                type: 'artifact',
                path: 'rtl.yosys.json'
            },
            {
                type: 'artifact',
                path: 'stats.yosys.json'
            }
        ];
    }

    private async updateFile(uri: vscode.Uri) {
        const fileName = basename(uri.path);
        let fileType: string;
        if (fileName === 'rtl.yosys.json') {
            fileType = 'rtl';
        } else if (fileName === 'stats.yosys.json') {
            fileType = 'stats';
        } else {
            this.warn(`Output file "${fileName}" not recognized. It might not be compatible with EDAcation.`);
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

        this.println('Updating output files...');
        await Promise.all(
            outputFiles.map((file) => {
                if (!file.uri) {
                    return;
                }
                this.updateFile(file.uri).catch((err) => {
                    this.warn(`Could not update file "${file.path}"; the file might not be usable!`);
                    console.trace(err);
                });
            })
        );
        this.println('Done.');

        // Open RTL file
        const rtlFile = outputFiles.find((file) => file.path.endsWith('rtl.yosys.json'));
        if (rtlFile) {
            const uri = vscode.Uri.joinPath(project.getRoot(), rtlFile.path);
            await vscode.commands.executeCommand('vscode.open', uri);
        }
    }
}
