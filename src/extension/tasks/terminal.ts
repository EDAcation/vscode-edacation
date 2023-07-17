import * as vscode from 'vscode';

import {Project, type Projects} from '../projects/index.js';
import {encodeText} from '../util.js';

import {BaseTaskProvider} from './base.js';
import {type TerminalMessage} from './messaging.js';
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
            task.definition.uri,
            task.definition.project,
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
    private task: TerminalTask<WorkerOptions>;

    private logMessages: string[];

    private writeEmitter = new vscode.EventEmitter<string>();
    private closeEmitter = new vscode.EventEmitter<number>();

    onDidWrite = this.writeEmitter.event;
    onDidClose = this.closeEmitter.event;

    constructor(
        projects: Projects,
        folder: vscode.WorkspaceFolder,
        definition: TaskDefinition,
        task: TerminalTask<WorkerOptions>
    ) {
        this.projects = projects;
        this.folder = folder;
        this.definition = definition;
        this.task = task;

        this.logMessages = [];
    }

    open() {
        this.execute();
    }

    close() {
        // Do nothing
    }

    protected println(line = '', stream: 'stdout' | 'stderr' = 'stdout') {
        let message = line;
        if (stream === 'stderr') {
            // Make line red (ANSI)
            message = '\x1b[31m' + message + '\x1b[0m';
        }
        this.writeEmitter.fire(`${message}\r\n`);

        const logMessage = `${new Date().toISOString()} - ${stream.toUpperCase()}: ${line}\r\n`;
        this.logMessages.push(logMessage);
    }

    protected async exit(code: number, project?: Project) {
        try {
            // Write logs
            const uri = vscode.Uri.joinPath(
                project ? project.getRoot() : this.folder.uri,
                `${this.task.getName()}.log`
            );
            await vscode.workspace.fs.writeFile(uri, encodeText(this.logMessages.join('')));

            if (project) {
                // Add log to output files
                await project.addOutputFileUris([uri]);
            }
        } catch (err) {
            console.error(err);
        }

        this.closeEmitter.fire(code);
    }

    protected async error(error: unknown, project?: Project) {
        if (error instanceof Error) {
            const messageLines = (error.stack || error.message).split('\n');
            for (const line of messageLines) {
                this.println(line, 'stderr');
            }
        } else if (typeof error === 'string') {
            this.println(error, 'stderr');
        }
        await this.exit(1, project);
    }

    private async execute(): Promise<void> {
        let project: Project;
        try {
            // Load EDA project
            project = await Project.load(
                this.projects,
                this.definition.uri || vscode.Uri.joinPath(this.folder.uri, this.definition.project)
            );
        } catch (err) {
            this.error(err);
            return;
        }

        this.task.onMessage(this.handleMessage.bind(this, project));

        try {
            await this.task.handleStart(project);

            await this.task.execute(project, this.definition);
        } catch (err) {
            await this.error(err, project);
        }
    }

    private async handleMessage(project: Project, message: TerminalMessage) {
        try {
            switch (message.type) {
                case 'println': {
                    this.println(message.line, message.stream);

                    break;
                }
                case 'error': {
                    await this.error(message.error, project);

                    break;
                }
                case 'done': {
                    const outputFiles = message.outputFiles || [];
                    const uris: vscode.Uri[] = [];
                    for (const file of outputFiles) {
                        const uri = vscode.Uri.joinPath(project.getRoot(), file.path);
                        uris.push(uri);

                        // Save file data (if requested)
                        const data = file.data;
                        if (!data) {
                            continue;
                        }
                        await vscode.workspace.fs.writeFile(uri, data);
                    }

                    // Add output files to project output
                    await project.addOutputFileUris(uris);

                    await this.task.handleEnd(project, outputFiles);

                    await this.exit(0, project);

                    break;
                }
            }
        } catch (err) {
            await this.error(err, project);
        }
    }
}
