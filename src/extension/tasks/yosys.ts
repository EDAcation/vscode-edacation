import {
    type YosysWorkerOptions,
    generateYosysSynthCommands,
    generateYosysSynthPrepareCommands,
    getYosysWorkerOptions
} from 'edacation';
import path from 'path-browserify';
import * as vscode from 'vscode';

import type {Project} from '../projects/index.js';
import {decodeJSON, encodeJSON, encodeText} from '../util.js';

import {AnsiModifier, type TaskOutputFile} from './messaging.js';
import {type TaskDefinition, type TaskIOFile, TerminalTask} from './task.js';
import {TaskProvider, TaskTerminal} from './terminal.js';
import {getConfiguredProvider} from './toolprovider.js';

type JSONValue = string | number | boolean | {[x: string]: JSONValue} | Array<JSONValue>;

export abstract class BaseYosysTerminalTask extends TerminalTask<YosysWorkerOptions> {
    private lastLogMessage?: string;

    getName(): string {
        return 'yosys';
    }

    getWorkerOptions(project: Project, targetId: string): YosysWorkerOptions {
        if (project.getInputFiles().length === 0) {
            throw new Error('Cannot synthesize project: no input files!');
        }

        return getYosysWorkerOptions(project, targetId);
    }

    getInputCommand(workerOptions: YosysWorkerOptions): string {
        return workerOptions.tool;
    }

    getInputArgs(workerOptions: YosysWorkerOptions): string[] {
        return [path.join(workerOptions.target.directory ?? '.', 'temp', 'design.ys')];
    }

    getInputFiles(workerOptions: YosysWorkerOptions): TaskIOFile[] {
        return workerOptions.inputFiles.map((path) => ({type: 'user', path}));
    }

    protected println(line?: string, stream: 'stdout' | 'stderr' = 'stdout', modifier?: AnsiModifier) {
        // Ignore duplicate lines, but allow repeated prints
        if (this.lastLogMessage === line) {
            this.lastLogMessage = undefined;
            return;
        } else {
            this.lastLogMessage = line;
        }

        super.println(line, stream, modifier);
    }

    async handleStart(project: Project) {
        this.println(`Synthesizing EDA project "${project.getName()}" using Yosys...`);
        this.println();
    }

    async handleEnd(project: Project, _outputFiles: TaskOutputFile[]) {
        this.println();
        this.println(
            `Finished synthesizing EDA project "${project.getName()}" using Yosys.`,
            undefined,
            AnsiModifier.GREEN
        );
        this.println();
    }
}

export class YosysTaskProvider extends TaskProvider {
    static getType() {
        return 'yosys';
    }

    getTaskType() {
        return YosysTaskProvider.getType();
    }

    protected createTaskTerminal(
        folder: vscode.WorkspaceFolder,
        definition: TaskDefinition
    ): TaskTerminal<YosysWorkerOptions> {
        const provider = getConfiguredProvider(this.context);
        const prepareTask = new YosysPrepareTerminalTask(provider);
        const synthesisTask = new YosysSynthTerminalTask(provider);

        return new TaskTerminal(this.projects, folder, definition, [prepareTask, synthesisTask]);
    }
}

class YosysPrepareTerminalTask extends BaseYosysTerminalTask {
    getInputFiles(workerOptions: YosysWorkerOptions): TaskIOFile[] {
        const files = super.getInputFiles(workerOptions);

        const commandsGenerated = generateYosysSynthPrepareCommands(workerOptions);
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
        return [{type: 'artifact', path: 'presynth.yosys.json'}];
    }

    private addCellTypes(record: JSONValue): JSONValue {
        if (Array.isArray(record)) {
            return record.map((v) => this.addCellTypes(v));
        } else if (typeof record === 'object') {
            const res: JSONValue = {};
            for (const [key, val] of Object.entries(record)) {
                res[key] = this.addCellTypes(val);
            }

            if (res.type && typeof res['attributes'] === 'object' && !Array.isArray(res['attributes'])) {
                res['attributes']['cellType'] = res.type;
            }

            return res;
        }

        return record;
    }

    async handleEnd(project: Project, outputFiles: TaskOutputFile[]) {
        await super.handleEnd(project, outputFiles);

        const presynthFile = outputFiles.find((file) => file.path.endsWith('presynth.yosys.json'));
        if (!presynthFile || !presynthFile.uri) return;

        const oldContent = decodeJSON(await vscode.workspace.fs.readFile(presynthFile.uri)) as JSONValue;
        const newContent = encodeJSON(this.addCellTypes(oldContent));
        await vscode.workspace.fs.writeFile(presynthFile.uri, newContent);
    }
}

class YosysSynthTerminalTask extends BaseYosysTerminalTask {
    getInputFiles(workerOptions: YosysWorkerOptions): TaskIOFile[] {
        const commandsGenerated = generateYosysSynthCommands(workerOptions);
        return [
            {
                type: 'artifact',
                path: 'presynth.yosys.json'
            },
            {
                type: 'temp',
                path: 'design.ys',
                data: encodeText(commandsGenerated.join('\r\n'))
            }
        ];
    }

    getOutputFiles(workerOptions: YosysWorkerOptions): TaskIOFile[] {
        return workerOptions.outputFiles.map((path) => ({type: 'artifact', path}));
    }

    async handleEnd(project: Project, outputFiles: TaskOutputFile[]) {
        await super.handleEnd(project, outputFiles);

        // Find LUT file
        const lutFile = outputFiles.find((file) => file.path.endsWith('luts.yosys.json'));
        if (!lutFile) return;
        const uri = vscode.Uri.joinPath(project.getRoot(), lutFile.path);

        // Update LUT file
        const oldContent = await vscode.workspace.fs.readFile(uri);
        const newContent = encodeJSON({
            type: 'luts',
            data: decodeJSON(oldContent)
        });
        await vscode.workspace.fs.writeFile(uri, newContent);

        // Open LUT file
        await vscode.commands.executeCommand('vscode.open', uri);
    }
}
