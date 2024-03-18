import * as vscode from 'vscode';

import type {Project, Projects} from '../projects/index.js';
import {encodeText, ensureEndOfLine} from '../util.js';

import {BaseTaskProvider} from './base.js';
import {AnsiModifier, type TerminalMessage} from './messaging.js';
import {type TaskDefinition, type TerminalTask} from './task.js';

const PROJECT_PATTERN = '**/*.edaproject';

export abstract class TaskProvider extends BaseTaskProvider {
    private taskPromise?: Promise<vscode.Task[]> | undefined;
    private fileSystemWatcher: vscode.FileSystemWatcher;

    constructor(context: vscode.ExtensionContext, projects: Projects) {
        super(context, projects);

        this.fileSystemWatcher = vscode.workspace.createFileSystemWatcher(PROJECT_PATTERN);
        this.fileSystemWatcher.onDidChange(() => (this.taskPromise = undefined));
        this.fileSystemWatcher.onDidCreate(() => (this.taskPromise = undefined));
        this.fileSystemWatcher.onDidDelete(() => (this.taskPromise = undefined));
    }

    provideTasks(): Promise<vscode.Task[]> {
        if (!this.taskPromise) {
            this.taskPromise = this.findTasks();
        }

        return this.taskPromise;
    }

    async resolveTask(task: vscode.Task): Promise<vscode.Task | undefined> {
        if (!task.definition.project) {
            throw new Error('Yosys task requires the path of an EDA project to be specified.');
        }

        if (
            task.scope === undefined ||
            task.scope === vscode.TaskScope.Global ||
            task.scope === vscode.TaskScope.Workspace
        ) {
            return undefined;
        }

        return this.getTask(
            task.scope,
            task.definition.uri as vscode.Uri,
            task.definition.project as string,
            task.definition as TaskDefinition
        );
    }

    dispose() {
        this.fileSystemWatcher.dispose();
    }

    protected abstract getTaskType(): string;

    protected abstract createTaskTerminal(
        folder: vscode.WorkspaceFolder,
        definition: TaskDefinition
    ): TaskTerminal<unknown>;

    private async findTasks(): Promise<vscode.Task[]> {
        const tasks: vscode.Task[] = [];

        if (!vscode.workspace.workspaceFolders) {
            return tasks;
        }

        for (const folder of vscode.workspace.workspaceFolders) {
            const paths = await vscode.workspace.findFiles(PROJECT_PATTERN);
            for (const path of paths) {
                tasks.push(this.getTask(folder, path, vscode.workspace.asRelativePath(path.fsPath, false)));
            }
        }

        return tasks;
    }

    private getTask(
        folder: vscode.WorkspaceFolder,
        uri: vscode.Uri,
        project: string,
        additionalDefinition?: TaskDefinition
    ): vscode.Task {
        const definition: TaskDefinition = {
            type: this.getTaskType(),
            project,
            uri,

            ...additionalDefinition
        };

        return new vscode.Task(
            definition,
            vscode.TaskScope.Workspace,
            project,
            this.getTaskType(),
            new vscode.CustomExecution(async () => this.createTaskTerminal(folder, definition))
        );
    }
}

export class TaskTerminal<WorkerOptions> implements vscode.Pseudoterminal {
    protected projects: Projects;
    private folder: vscode.WorkspaceFolder;
    private definition: TaskDefinition;

    private tasks: TerminalTask<WorkerOptions>[];
    private curTask: TerminalTask<WorkerOptions> | null;

    private curProject: Project | null;

    private logMessages: string[];

    private taskFinishEmitter = new vscode.EventEmitter<number>();
    private writeEmitter = new vscode.EventEmitter<string>();
    private closeEmitter = new vscode.EventEmitter<number>();

    onDidWrite = this.writeEmitter.event;
    onDidClose = this.closeEmitter.event;

    constructor(
        projects: Projects,
        folder: vscode.WorkspaceFolder,
        definition: TaskDefinition,
        tasks: TerminalTask<WorkerOptions>[]
    ) {
        this.projects = projects;
        this.folder = folder;
        this.definition = definition;

        this.tasks = tasks;
        this.curTask = null;

        this.curProject = null;

        this.logMessages = [];

        this.taskFinishEmitter.event(this.executeNextTask.bind(this));
    }

    async open() {
        await this.executeNextTask();
    }

    close() {
        // Do nothing
    }

    protected println(line = '', stream: 'stdout' | 'stderr' = 'stdout', modifier?: AnsiModifier) {
        let message = line;
        if (modifier) {
            message = `${modifier}${message}${AnsiModifier.RESET}`;
        } else if (stream === 'stderr') {
            // Make line red
            message = `${AnsiModifier.RED}${message}${AnsiModifier.RESET}`;
        }

        this.writeEmitter.fire(ensureEndOfLine(message));

        const logMessage = `${new Date().toISOString()} - ${stream.toUpperCase()}: ${ensureEndOfLine(line)}`;
        this.logMessages.push(logMessage);
    }

    protected async exit(code: number) {
        if (!this.curTask) return;

        try {
            // Write logs
            const uri = vscode.Uri.joinPath(
                this.curProject ? this.curProject.getRoot() : this.folder.uri,
                `${this.curTask?.getName()}.log`
            );
            await vscode.workspace.fs.writeFile(uri, encodeText(this.logMessages.join('')));

            if (this.curProject) {
                // Add log to output files
                await this.curProject.addOutputFileUris([uri]);
            }
        } catch (err) {
            console.error(err);
        }

        this.taskFinishEmitter.fire(code);
    }

    protected async error(error: unknown) {
        if (error instanceof Error) {
            const messageLines = (error.stack || error.message).split('\n');
            for (const line of messageLines) {
                this.println(line, 'stderr');
            }
        } else if (typeof error === 'string') {
            this.println(error, 'stderr');
        }
        await this.exit(1);
    }

    private async executeNextTask(prevExitCode: number = 0): Promise<void> {
        // Set current project once
        if (!this.curProject) {
            this.curProject = this.projects.getCurrent() ?? null;
            if (!this.curProject) {
                await this.error(new Error('No current project!'));
                return;
            }
        }

        if (this.tasks.length === 0 || prevExitCode !== 0) {
            this.curTask = null;
            this.curProject = null;

            this.closeEmitter.fire(prevExitCode);
            return;
        }

        this.curTask = this.tasks[0];
        this.tasks.splice(0, 1);

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.curTask.onMessage(this.handleMessage.bind(this, this.curTask));

        try {
            await this.curTask.handleStart(this.curProject);

            await this.curTask.execute(this.curProject, this.definition);
        } catch (err) {
            await this.error(err);
        }
    }

    private async handleMessage(task: TerminalTask<WorkerOptions>, message: TerminalMessage) {
        if (!this.curProject) {
            console.warn(`Received message but no project active! ${JSON.stringify(message)}`);
            return;
        }

        try {
            switch (message.type) {
                case 'println': {
                    this.println(message.line, message.stream, message.modifier);

                    break;
                }
                case 'error': {
                    await this.error(message.error);

                    break;
                }
                case 'done': {
                    const outputFiles = message.outputFiles || [];
                    for (const file of outputFiles) {
                        // Construct URI if missing
                        if (!file.uri) {
                            file.uri = vscode.Uri.joinPath(this.curProject.getRoot(), file.path);
                        }

                        // Save file data (if requested)
                        const data = file.data;
                        if (data) {
                            await vscode.workspace.fs.writeFile(file.uri, data);
                        }
                    }

                    // Add output files to project output
                    const uris = outputFiles.map((outp) => outp.uri).filter((outp): outp is vscode.Uri => !!outp);
                    await this.curProject.addOutputFileUris(uris);

                    await task.handleEnd(this.curProject, outputFiles);
                    task.cleanup();

                    await this.exit(0);

                    break;
                }
            }
        } catch (err) {
            await this.error(err);
        }
    }
}
