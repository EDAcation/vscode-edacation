import * as vscode from 'vscode';
import {ExtensionMessage, MessageFile, WorkerMessage} from '../messages';

import {Project, Projects} from '../projects';
import {encodeText} from '../util';
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
        if (!this.taskPromise) {
            this.taskPromise = this.findTasks();
        }

        return this.taskPromise;
    }

    async resolveTask(task: vscode.Task): Promise<vscode.Task | undefined> {
        if (!task.definition.project) {
            throw new Error('Yosys task requires the path of an EDA project to be specified.');
        }

        if (task.scope === undefined || task.scope === vscode.TaskScope.Global || task.scope === vscode.TaskScope.Workspace) {
            return undefined;
        }

        return this.getTask(task.scope, task.definition.project, task.definition as WorkerTaskDefinition);
    }

    dispose() {
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

export interface WorkerOutputFile {
    path: string;
    uri: vscode.Uri;
}

export abstract class WorkerTaskTerminal implements vscode.Pseudoterminal {

    protected context: vscode.ExtensionContext;
    protected projects: Projects;
    private folder: vscode.WorkspaceFolder;
    private definition: WorkerTaskDefinition;

    private logMessages: string[];

    private writeEmitter = new vscode.EventEmitter<string>();
    private closeEmitter = new vscode.EventEmitter<number>();

    onDidWrite = this.writeEmitter.event;
    onDidClose = this.closeEmitter.event;

    constructor(context: vscode.ExtensionContext, projects: Projects, folder: vscode.WorkspaceFolder, definition: WorkerTaskDefinition) {
        this.context = context;
        this.projects = projects;
        this.folder = folder;
        this.definition = definition;

        this.logMessages = [];
    }

    open() {
        this.execute();
    }

    close() {}

    protected abstract getWorkerName(): string;

    protected abstract getWorkerFileName(): string;

    protected abstract getInputArgs(project: Project): string[];

    protected abstract getInputFiles(project: Project): MessageFile[];

    protected abstract getOutputFiles(project: Project): string[];

    protected abstract handleStart(project: Project): Promise<void>;

    protected abstract handleEnd(project: Project, outputFiles: WorkerOutputFile[]): Promise<void>;

    protected println(line: string = '') {
        this.writeEmitter.fire(`${line}\r\n`);
        this.logMessages.push(`${line}\r\n`);
    }

    protected async exit(code: number, project?: Project) {
        this.closeEmitter.fire(code);

        const uri = vscode.Uri.joinPath(project ? project.getRoot() : this.folder.uri, `${this.getWorkerName()}.log`);
        await vscode.workspace.fs.writeFile(uri, encodeText(this.logMessages.join('')));

        if (project) {
            // TODO: add log file to project output
        }
    }

    protected async error(error: unknown, project?: Project) {
        if (error instanceof Error) {
            this.println(error.stack || error.message);
        } else if (typeof error === 'string') {
            this.println(error);
        }
        await this.exit(1, project);
    }

    protected send(worker: Worker, message: WorkerMessage, transferables: Transferable[] = []) {
        worker.postMessage(message, transferables);
    }

    private async execute(): Promise<void> {
        let project: Project;
        try {
            // Load EDA project
            project = await Project.load(this.projects, this.definition.uri || vscode.Uri.joinPath(this.folder.uri, this.definition.project));
        } catch (err) {
            this.error(err);
            return;
        }

        try {
            await this.handleStart(project);

            // Create worker
            const worker = this.createWorker(project);

            // Read files
            const files: MessageFile[] = [];
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
            this.send(worker, {
                type: 'input',
                args: this.getInputArgs(project),
                inputFiles: files.concat(this.getInputFiles(project)),
                outputFiles: this.getOutputFiles(project)
            }, files.map(({data}) => data.buffer));
        } catch (err) {
            await this.error(err, project);
        }
    }

    private createWorker(project: Project): Worker {
        const worker = new Worker(vscode.Uri.joinPath(this.context.extensionUri, 'workers', 'dist', this.getWorkerFileName()).toString(true));

        worker.addEventListener('message', this.handleMessage.bind(this, project));
        worker.addEventListener('messageerror',this.handleMessageError.bind(this, project));
        worker.addEventListener('error', this.handleError.bind(this, project));

        return worker;
    }

    private async handleMessage(project: Project, event: MessageEvent<ExtensionMessage>) {
        try {
            switch (event.data.type) {
                case 'terminal': {
                    this.println(event.data.data);

                    break;
                }
                case 'output': {
                    // Write output files
                    const files: WorkerOutputFile[] = [];
                    for (const file of event.data.files) {
                        const uri = vscode.Uri.joinPath(project.getRoot(), file.path);
                        files.push({
                            path: file.path,
                            uri
                        });

                        await vscode.workspace.fs.writeFile(uri, file.data);
                    }

                    // TODO: add files to project output

                    await this.handleEnd(project, files);

                    await this.exit(0);

                    break;
                }
                case 'error': {
                    await this.error(event.data.error, project);

                    break;
                }
            }
        } catch (err) {
            await this.error(err, project);
        }
    }

    private handleMessageError(project: Project, event: MessageEvent) {
        console.error('Message error:', event);

        this.error(new Error('Message error'), project);
    }

    private handleError(project: Project, event: ErrorEvent) {
        this.error(event.error, project);
    }
}
