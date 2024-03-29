import {
    type YosysWorkerOptions,
    generateYosysSynthCommands,
    generateYosysSynthPrepareCommands,
    getYosysWorkerOptions
} from 'edacation';
import * as vscode from 'vscode';

import type {MessageFile} from '../../common/messages.js';
import type {Project} from '../projects/index.js';
import {decodeJSON, encodeJSON, encodeText} from '../util.js';

import {AnsiModifier, type TaskOutputFile} from './messaging.js';
import {getConfiguredRunner} from './runner.js';
import {type TaskDefinition, TerminalTask} from './task.js';
import {TaskProvider, TaskTerminal} from './terminal.js';

type JSONValue = string | number | boolean | {[x: string]: JSONValue} | Array<JSONValue>;

export abstract class BaseYosysTerminalTask extends TerminalTask<YosysWorkerOptions> {
    private lastLogMessage?: string;

    getName(): string {
        return 'yosys';
    }

    getWorkerFileName(): string {
        return 'yosys.js';
    }

    getWorkerOptions(project: Project, targetId: string): YosysWorkerOptions {
        return getYosysWorkerOptions(project, targetId);
    }

    getInputCommand(workerOptions: YosysWorkerOptions): string {
        return workerOptions.tool;
    }

    getInputArgs(_workerOptions: YosysWorkerOptions): string[] {
        return ['design.ys'];
    }

    getInputFiles(workerOptions: YosysWorkerOptions): string[] {
        return workerOptions.inputFiles;
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
        const runner = getConfiguredRunner(this.context);
        const prepareTask = new YosysPrepareTerminalTask(runner);
        const synthesisTask = new YosysSynthTerminalTask(runner);

        return new TaskTerminal(this.projects, folder, definition, [prepareTask, synthesisTask]);
    }
}

class YosysPrepareTerminalTask extends BaseYosysTerminalTask {
    getGeneratedInputFiles(workerOptions: YosysWorkerOptions): MessageFile[] {
        const commandsGenerated = generateYosysSynthPrepareCommands(workerOptions.inputFiles);

        return [
            {
                path: 'design.ys',
                data: encodeText(commandsGenerated.join('\r\n'))
            }
        ];
    }

    getOutputFiles(_workerOptions: YosysWorkerOptions): string[] {
        return ['presynth.digitaljs.json'];
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

        const presynthFile = outputFiles.find((file) => file.path.endsWith('presynth.digitaljs.json'));
        if (!presynthFile || !presynthFile.uri) return;

        const oldContent = decodeJSON(await vscode.workspace.fs.readFile(presynthFile.uri)) as JSONValue;
        const newContent = encodeJSON(this.addCellTypes(oldContent));
        await vscode.workspace.fs.writeFile(presynthFile.uri, newContent);
    }
}

class YosysSynthTerminalTask extends BaseYosysTerminalTask {
    getGeneratedInputFiles(_workerOptions: YosysWorkerOptions): MessageFile[] {
        const commandsGenerated = generateYosysSynthCommands();

        return [
            {
                path: 'design.ys',
                data: encodeText(commandsGenerated.join('\r\n'))
            }
        ];
    }

    getInputFiles(_workerOptions: YosysWorkerOptions): string[] {
        return ['presynth.digitaljs.json'];
    }

    getOutputFiles(workerOptions: YosysWorkerOptions): string[] {
        return workerOptions.outputFiles;
    }

    async handleEnd(project: Project, outputFiles: TaskOutputFile[]) {
        await super.handleEnd(project, outputFiles);

        // Open LUT file in DigitalJS editor
        const lutFile = outputFiles.find((file) => file.path.endsWith('luts.digitaljs.json'));
        if (lutFile) {
            const uri = vscode.Uri.joinPath(project.getRoot(), lutFile.path);
            await vscode.commands.executeCommand('vscode.open', uri);
        }
    }
}
