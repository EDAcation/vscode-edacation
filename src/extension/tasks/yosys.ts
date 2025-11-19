import {type WorkerStep, type YosysStep, type YosysWorkerOptions, getYosysSynthesisWorkerOptions} from 'edacation';
import * as vscode from 'vscode';
import {Utils} from 'vscode-uri';

import type {Project} from '../projects/index.js';
import {decodeJSON, encodeJSON} from '../util.js';

import {AnsiModifier, type TaskOutputFile} from './messaging.js';
import {type TaskDefinition, type TaskIOFile, TerminalTask} from './task.js';
import {TaskProvider, TaskTerminal} from './terminal.js';
import {getConfiguredProvider} from './toolprovider.js';

type JSONValue = string | number | boolean | {[x: string]: JSONValue} | Array<JSONValue>;

const addCellTypes = (record: JSONValue): JSONValue => {
    if (Array.isArray(record)) {
        return record.map((v) => addCellTypes(v));
    } else if (typeof record === 'object') {
        const res: JSONValue = {};
        for (const [key, val] of Object.entries(record)) {
            res[key] = addCellTypes(val);
        }

        if (res.type && typeof res['attributes'] === 'object' && !Array.isArray(res['attributes'])) {
            res['attributes']['cellType'] = res.type;
        }

        return res;
    }

    return record;
};

export abstract class BaseYosysTerminalTask extends TerminalTask<YosysWorkerOptions> {
    private lastLogMessage?: string;

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

    async handleEnd(project: Project, _workerOptions: YosysWorkerOptions, _outputFiles: TaskOutputFile[]) {
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
        const task = new YosysSynthTerminalTask(provider);
        return new TaskTerminal(this.projects, folder, definition, task);
    }
}

class YosysSynthTerminalTask extends BaseYosysTerminalTask {
    getName(): string {
        return 'yosys-synthesis';
    }

    getWorkerOptions(project: Project, targetId: string): YosysWorkerOptions {
        if (project.getInputFiles().length === 0) {
            throw new Error('Cannot synthesize project: no input files!');
        }

        return getYosysSynthesisWorkerOptions(project, targetId);
    }

    getWorkerSteps(workerOptions: YosysWorkerOptions): YosysStep[] {
        return workerOptions.steps;
    }

    getInputFiles(workerOptions: YosysWorkerOptions): TaskIOFile[] {
        return workerOptions.inputFiles.map((path) => ({type: 'user', path}));
    }

    getOutputFiles(workerOptions: YosysWorkerOptions): TaskIOFile[] {
        return workerOptions.outputFiles.map((path) => ({type: 'artifact', path}));
    }

    async handleStepEnd(project: Project, workerOptions: YosysWorkerOptions, step: WorkerStep): Promise<void> {
        await super.handleStepEnd(project, workerOptions, step);

        if (step.id !== 'prepare') return;

        const target = project.getTarget(workerOptions.target.id);
        if (!target) {
            this.println('Invalid target: element coloring will not be supported!', 'stderr');
            return;
        }

        // Update presynth file contents
        const presynthFile = project.getFileUri(target.getFile('presynth.yosys.json'));
        const oldContent = decodeJSON(await vscode.workspace.fs.readFile(presynthFile)) as JSONValue;
        const newContent = encodeJSON(addCellTypes(oldContent));
        await vscode.workspace.fs.writeFile(presynthFile, newContent);
    }

    async handleEnd(project: Project, workerOptions: YosysWorkerOptions, outputFiles: TaskOutputFile[]) {
        await super.handleEnd(project, workerOptions, outputFiles);

        // Find synthesis file
        const outFiles = outputFiles.filter((file) => file.path.endsWith('.json'));
        if (outFiles.length !== 1) return;
        const synthUri = project.getFileUri(outFiles[0].path);
        const lutUri = vscode.Uri.joinPath(Utils.dirname(synthUri), 'luts.yosys.json');

        // Write LUT file
        const oldContent = await vscode.workspace.fs.readFile(synthUri);
        const newContent = encodeJSON({
            type: 'luts',
            data: decodeJSON(oldContent)
        });
        await vscode.workspace.fs.writeFile(lutUri, newContent);

        await project.addOutputFileUris([lutUri], workerOptions.target.id);

        // Open LUT file
        await vscode.commands.executeCommand('vscode.open', lutUri);
    }
}
