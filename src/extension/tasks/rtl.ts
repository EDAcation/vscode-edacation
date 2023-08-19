import {type YosysWorkerOptions, encodeText, generateYosysRTLCommands} from 'edacation';
import {basename} from 'path-browserify';
import * as vscode from 'vscode';

import type {MessageFile} from '../../common/messages.js';
import type {Project} from '../projects/index.js';
import {decodeJSON, encodeJSON} from '../util.js';

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

    protected async handleEnd(project: Project, outputFiles: WorkerOutputFile[]) {
        super.handleEnd(project, outputFiles);

        // Update file contents so our custom editor can handle them
        // TODO: print the message to stderr as an error (red text).
        // This is implemented in https://github.com/EDAcation/vscode-edacation/pull/14.
        await Promise.all(
            outputFiles.map((file) =>
                this.updateFile(file.uri).catch((_err) =>
                    this.println(`Error while updating "${file.path}"; the file might not be usable!`)
                )
            )
        );

        // Open RTL file in DigitalJS editor
        const rtlFile = outputFiles.find((file) => file.path.endsWith('rtl.digitaljs.json'));
        if (rtlFile) {
            vscode.commands.executeCommand('vscode.open', rtlFile.uri);
        }
    }
}
