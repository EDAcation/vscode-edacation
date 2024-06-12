import {type WorkerOptions as _WorkerOptions} from 'edacation';
import * as vscode from 'vscode';

import type {Project, Projects} from '../projects/index.js';
import {encodeText, ensureEndOfLine} from '../util.js';

import {BaseTaskProvider} from './base.js';
import {AnsiModifier, type TerminalMessage} from './messaging.js';
import {type TaskDefinition, type TerminalTask} from './task.js';

const PROJECT_PATTERN = '**/*.edaproject';

interface JobDefinition<WorkerOptions extends _WorkerOptions> {
    task: TerminalTask<WorkerOptions>;
    targetId: string;
}

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
    ): TaskTerminal<_WorkerOptions>;

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

export class TaskTerminal<WorkerOptions extends _WorkerOptions> implements vscode.Pseudoterminal {
    protected projects: Projects;
    private folder: vscode.WorkspaceFolder;
    private definition: TaskDefinition;

    private tasks: TerminalTask<WorkerOptions>[];
    private curJob: JobDefinition<WorkerOptions> | null;

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
        this.curJob = null;

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
        if (!this.curJob) return;

        try {
            // Write logs
            const uri = vscode.Uri.joinPath(
                this.curProject ? this.curProject.getRoot() : this.folder.uri,
                'logs',
                `${this.curJob.task.getName()}.log`
            );
            await vscode.workspace.fs.writeFile(uri, encodeText(this.logMessages.join('')));

            if (this.curProject) {
                // Add log to output files
                await this.curProject.addOutputFileUris([uri], this.curJob.targetId);
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
            this.curJob = null;
            this.curProject = null;

            this.closeEmitter.fire(prevExitCode);
            return;
        }

        this.curJob = {
            task: this.tasks[0],
            targetId: this.definition.targetId ?? this.curProject.getConfiguration().targets[0].id
        };
        this.tasks.splice(0, 1);

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.curJob.task.onMessage(this.handleMessage.bind(this, this.curJob));

        try {
            // Ensure that target dirs are set correctly BEFORE running the task
            await this.curProject.updateTargetDirectories();

            await this.curJob.task.handleStart(this.curProject);

            await this.curJob.task.execute(this.curProject, this.curJob.targetId);
        } catch (err) {
            await this.error(err);
        }
    }

    private async handleMessage(job: JobDefinition<WorkerOptions>, message: TerminalMessage) {
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
                    await this.curProject.addOutputFileUris(uris, job.targetId);

                    await job.task.handleEnd(this.curProject, outputFiles);
                    job.task.cleanup();

                    await this.exit(0);

                    break;
                }
            }
        } catch (err) {
            await this.error(err);
        }
    }
}
