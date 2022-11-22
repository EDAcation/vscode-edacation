import * as vscode from 'vscode';

import {Project, Projects} from '../projects';
import {BaseTaskProvider} from './base';

const PROJECT_PATTERN = '**/*.edaproject';

export interface WorkerTaskDefinition extends vscode.TaskDefinition {
    project: string;
    uri?: vscode.Uri;
}

export abstract class WorkerTaskProvider extends BaseTaskProvider {

    private taskPromise?: Promise<vscode.Task[]> | undefined;
    private fileSystemWatcher: vscode.FileSystemWatcher;

    constructor(context: vscode.ExtensionContext, projects: Projects) {
        super(context, projects);

        this.fileSystemWatcher = vscode.workspace.createFileSystemWatcher(PROJECT_PATTERN);
        this.fileSystemWatcher.onDidChange(() => this.taskPromise = undefined);
        this.fileSystemWatcher.onDidCreate(() => this.taskPromise = undefined);
        this.fileSystemWatcher.onDidDelete(() => this.taskPromise = undefined);
    }

    provideTasks(): Promise<vscode.Task[]> {
        console.log('provide tasks');

        if (!this.taskPromise) {
            this.taskPromise = this.findTasks();
        }

        return this.taskPromise;
    }

    async resolveTask(task: vscode.Task): Promise<vscode.Task | undefined> {
        console.log('resolve task', task);

        if (!task.definition.project) {
            throw new Error('Yosys task requires the path of an EDA project to be specified.');
        }

        if (task.scope === undefined || task.scope === vscode.TaskScope.Global || task.scope === vscode.TaskScope.Workspace) {
            return undefined;
        }

        return this.getTask(task.scope, task.definition.project, task.definition as WorkerTaskDefinition);
    }

    dispose() {
        console.log('dispose');
        this.fileSystemWatcher.dispose();
    }

    protected abstract getTaskType(): string;

    protected abstract createTaskTerminal(folder: vscode.WorkspaceFolder, definition: WorkerTaskDefinition): WorkerTaskTerminal;

    private async findTasks(): Promise<vscode.Task[]> {
        const tasks: vscode.Task[] = [];

        if (!vscode.workspace.workspaceFolders) {
            return tasks;
        }

        for (const folder of vscode.workspace.workspaceFolders) {
            const paths = await vscode.workspace.findFiles(PROJECT_PATTERN);
            for (const path of paths) {
                tasks.push(this.getTask(folder, vscode.workspace.asRelativePath(path.fsPath, false)));
            }
        }

        return tasks;
    }

    private getTask(folder: vscode.WorkspaceFolder, project: string, additionalDefinition?: WorkerTaskDefinition): vscode.Task {
        const definition: WorkerTaskDefinition = {
            type: this.getTaskType(),
            project,
            uri: vscode.Uri.joinPath(folder.uri, project),

            ...additionalDefinition
        };

        return new vscode.Task(definition, vscode.TaskScope.Workspace, `${folder.name}/${project}`, this.getTaskType(), new vscode.CustomExecution(async () =>
            this.createTaskTerminal(folder, definition)
        ));
    }
}

export abstract class WorkerTaskTerminal implements vscode.Pseudoterminal {

    protected context: vscode.ExtensionContext;
    protected projects: Projects;
    private folder: vscode.WorkspaceFolder;
    private definition: WorkerTaskDefinition;

    private writeEmitter = new vscode.EventEmitter<string>();
    private closeEmitter = new vscode.EventEmitter<number>();

    onDidWrite = this.writeEmitter.event;
    onDidClose = this.closeEmitter.event;

    constructor(context: vscode.ExtensionContext, projects: Projects, folder: vscode.WorkspaceFolder, definition: WorkerTaskDefinition) {
        this.context = context;
        this.projects = projects;
        this.folder = folder;
        this.definition = definition;
    }

    open() {
        this.execute();
    }

    close() {}

    protected println(line: string = '') {
        this.writeEmitter.fire(`${line}\r\n`);
    }

    protected exit(code: number) {
        this.closeEmitter.fire(code);
    }

    protected abstract run(project: Project): Promise<void>;

    private async execute(): Promise<void> {
        try {
            const project = await Project.load(this.projects, this.definition.uri || vscode.Uri.joinPath(this.folder.uri, this.definition.project));

            await this.run(project);
        } catch (err) {
            if (err instanceof Error) {
                this.println(err.stack || err.message);
            }
            this.exit(1);
        }
    }
}
