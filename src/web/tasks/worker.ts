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

export interface ToolMessageOutput {
    type: 'output';
}

export type ToolMessage = ToolMessageOutput;

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

    protected abstract getWorkerFileName(): string;

    protected abstract handleStart(project: Project): Promise<void>;

    protected abstract handleEnd(project: Project): Promise<void>;

    protected println(line: string = '') {
        this.writeEmitter.fire(`${line}\r\n`);
    }

    protected exit(code: number) {
        this.closeEmitter.fire(code);
    }

    protected error(error: unknown) {
        if (error instanceof Error) {
            this.println(error.stack || error.message);
        } else if (typeof error === 'string') {
            this.println(error);
        }
        this.exit(1);
    }

    private async execute(): Promise<void> {
        try {
            // Load EDA project
            const project = await Project.load(this.projects, this.definition.uri || vscode.Uri.joinPath(this.folder.uri, this.definition.project));

            await this.handleStart(project);

            // Create worker
            const worker = this.createWorker(project);

            // Read files
            const files: {path: string; data: Uint8Array}[] = [];
            for (const file of project.getFiles()) {
                // TODO: improve support for relative paths
                const path = file.path.replace(`${project.getRoot().path}/`, '');

                const data = await vscode.workspace.fs.readFile(file);

                files.push({
                    path,
                    data
                });
            }

            // Send input to worker
            worker.postMessage({
                type: 'input',
                files
            }, files.map(({data}) => data.buffer));
        } catch (err) {
            this.error(err);
        }
    }

    private createWorker(project: Project): Worker {
        const worker = new Worker(vscode.Uri.joinPath(this.context.extensionUri, 'workers', 'dist', this.getWorkerFileName()).toString(true));

        worker.addEventListener('message', this.handleMessage.bind(this, project));
        worker.addEventListener('messageerror',this.handleMessageError.bind(this));
        worker.addEventListener('error', this.handleError.bind(this));

        return worker;
    }

    private async handleMessage(project: Project, event: MessageEvent<ToolMessage>) {
        try {
            switch (event.data.type) {
                case 'output': {
                    console.log('output', event.data);

                    // TODO: handle output

                    await this.handleEnd(project);

                    this.exit(0);

                    break;
                }
            }
        } catch (err) {
            this.error(err);
        }
    }

    private handleMessageError(event: MessageEvent) {
        console.error('Message error:', event);

        this.error(new Error('Message error'));
    }

    private handleError(event: ErrorEvent) {
        this.error(event.error);
    }
}
