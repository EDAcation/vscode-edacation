import * as vscode from 'vscode';

import type {ExtensionMessage, MessageFile, WorkerMessage} from '../../common/messages.js';
import {Project, type Projects} from '../projects/index.js';
import {decodeText, encodeText} from '../util.js';

import {BaseTaskProvider} from './base.js';
import {type TaskOutputFile, type TerminalTask} from './task.js';

const PROJECT_PATTERN = '**/*.edaproject';

export interface TaskDefinition extends vscode.TaskDefinition {
    project: string;
    targetId?: string;
    uri?: vscode.Uri;
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
    protected context: vscode.ExtensionContext;
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
        context: vscode.ExtensionContext,
        projects: Projects,
        folder: vscode.WorkspaceFolder,
        definition: TaskDefinition,
        task: TerminalTask<WorkerOptions>
    ) {
        this.context = context;
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

    protected println(line = '', _stream: 'stdout' | 'stderr' = 'stdout') {
        this.writeEmitter.fire(`${line}\r\n`);
        this.logMessages.push(`${line}\r\n`);
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
            project = await Project.load(
                this.projects,
                this.definition.uri || vscode.Uri.joinPath(this.folder.uri, this.definition.project)
            );
        } catch (err) {
            this.error(err);
            return;
        }

        try {
            await this.task.handleStart(project);

            // TODO: abstract into TaskRunner
            const workerOptions = this.task.getWorkerOptions(
                project,
                this.definition.targetId ?? project.getConfiguration().targets[0].id
            );

            // Create worker
            // TODO: abstract into TaskRunner
            const worker = this.createWorker(project, workerOptions);

            const command = this.task.getInputCommand(workerOptions);
            const args = this.task.getInputArgs(workerOptions);
            const inputFiles = this.task.getInputFiles(workerOptions);
            const generatedInputFiles = this.task.getGeneratedInputFiles(workerOptions);
            const outputFiles = this.task.getOutputFiles(workerOptions);

            // Read input files
            const files: MessageFile[] = [];
            for (const file of inputFiles) {
                const data = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(project.getRoot(), file));

                files.push({
                    path: file,
                    data
                });
            }

            for (const inputFile of generatedInputFiles) {
                this.println(`${inputFile.path}:`);
                this.println(decodeText(inputFile.data));
                this.println();
            }

            this.println(`${command} ${args.join(' ')}`);
            this.println();

            // Send input to worker
            this.send(
                worker,
                {
                    type: 'input',
                    command,
                    args,
                    inputFiles: files.concat(generatedInputFiles),
                    outputFiles
                },
                files.map(({data}) => data.buffer)
            );
        } catch (err) {
            await this.error(err, project);
        }
    }

    // TODO: abstract into TaskRunner
    private createWorker(project: Project, workerOptions: WorkerOptions): Worker {
        const worker = new Worker(
            vscode.Uri.joinPath(
                this.context.extensionUri,
                'dist',
                'workers',
                this.task.getWorkerFileName(workerOptions)
            ).toString(true)
        );

        worker.addEventListener('message', this.handleMessage.bind(this, project));
        worker.addEventListener('messageerror', this.handleMessageError.bind(this, project));
        worker.addEventListener('error', this.handleError.bind(this, project));

        return worker;
    }

    private async handleMessage(project: Project, event: MessageEvent<ExtensionMessage>) {
        try {
            switch (event.data.type) {
                case 'terminal': {
                    this.println(event.data.data, event.data.stream);

                    break;
                }
                case 'output': {
                    // Write output files
                    const files: TaskOutputFile[] = [];
                    for (const file of event.data.files) {
                        const uri = vscode.Uri.joinPath(project.getRoot(), file.path);
                        files.push({
                            path: file.path,
                            uri
                        });

                        await vscode.workspace.fs.writeFile(uri, file.data);
                    }

                    // Add output files to project output
                    await project.addOutputFileUris(files.map((file) => file.uri));

                    await this.task.handleEnd(project, files);

                    await this.exit(0, project);

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
