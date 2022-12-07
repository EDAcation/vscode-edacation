import path from 'path';
import * as vscode from 'vscode';

import {decodeJSON, encodeJSON} from './util';

export interface ProjectFile {
    path: string;
    uri: vscode.Uri;
}

export class Project {

    private readonly projects: Projects;
    private uri: vscode.Uri;
    private root: vscode.Uri;
    private name: string;
    private inputFiles: ProjectFile[];
    private outputFiles: ProjectFile[];

    constructor(projects: Projects, uri: vscode.Uri, name?: string, inputFiles: string[] = [], outputFiles: string[] = []) {
        this.projects = projects;

        this.uri = uri;
        this.root = this.uri.with({
            path: path.dirname(this.uri.path)
        });
        this.name = name ? name : path.basename(this.uri.path, '.edaproject');
        this.inputFiles = inputFiles.map((file) => ({path: file, uri: vscode.Uri.joinPath(this.getRoot(), file)}));
        this.outputFiles = outputFiles.map((file) => ({path: file, uri: vscode.Uri.joinPath(this.getRoot(), file)}));
    }

    getUri() {
        return this.uri;
    }

    isUri(uri: vscode.Uri) {
        return this.uri.toString() === uri.toString();
    }

    getRoot() {
        return this.root;
    }

    getName() {
        return this.name;
    }

    getInputFiles() {
        return this.inputFiles;
    }

    hasInputFile(filePath: string) {
        return this.inputFiles.some((file) => file.path === filePath);
    }

    async addInputFiles(fileUris: vscode.Uri[]) {
        for (const fileUri of fileUris) {
            if (!fileUri.path.startsWith(this.getRoot().path)) {
                await vscode.window.showErrorMessage(`File "${fileUri.path}" must be in the a subfolder of the EDA project root.`);
                continue;
            }

            const relativeFileUri = fileUri.path.replace(this.getRoot().path, '.');

            if (!this.hasInputFile(relativeFileUri)) {
                this.inputFiles.push({path: relativeFileUri, uri: fileUri});
            }
        }

        this.inputFiles.sort();

        this.projects.emitInputFileChange();

        await this.save();
    }

    async removeInputFiles(fileUris: string[]) {
        this.inputFiles = this.inputFiles.filter((file) => !fileUris.includes(file.path));

        this.projects.emitInputFileChange();

        await this.save();
    }

    getOutputFiles() {
        return this.outputFiles;
    }

    hasOutputFile(filePath: string) {
        return this.outputFiles.some((file) => file.path === filePath);
    }

    async addOutputFiles(fileUris: vscode.Uri[]) {
        for (const fileUri of fileUris) {
            if (!fileUri.path.startsWith(this.getRoot().path)) {
                await vscode.window.showErrorMessage(`File "${fileUri.path}" must be in the a subfolder of the EDA project root.`);
                continue;
            }

            const relativeFileUri = fileUri.path.replace(this.getRoot().path, '.');

            if (!this.hasOutputFile(relativeFileUri)) {
                this.outputFiles.push({path: relativeFileUri, uri: fileUri});
            }
        }

        this.outputFiles.sort();

        this.projects.emitOutputFileChange();

        await this.save();
    }

    async removeOutputFiles(filePaths: string[]) {
        this.outputFiles = this.outputFiles.filter((file) => !filePaths.includes(file.path));

        this.projects.emitOutputFileChange();

        await this.save();
    }

    private async save() {
        await Project.store(this);
    }

    static serialize(project: Project): any {
        return {
            name: project.name,
            inputFiles: project.inputFiles.map((file) => file.path),
            outputFiles: project.outputFiles.map((file) => file.path)
        };
    }

    static deserialize(projects: Projects, uri: vscode.Uri, data: any): Project {
        const name: string = data.name;
        const inputFiles: string[] = data.inputFiles ?? [];
        const outputFiles: string[] = data.outputFiles ?? [];

        return new Project(projects, uri, name, inputFiles, outputFiles);
    }

    static async load(projects: Projects, uri: vscode.Uri): Promise<Project> {
        const data = decodeJSON(await vscode.workspace.fs.readFile(uri));
        const project = Project.deserialize(projects, uri, data);
        return project;
    }

    static async store(project: Project): Promise<vscode.Uri> {
        const data = Project.serialize(project);
        await vscode.workspace.fs.writeFile(project.uri, encodeJSON(data));
        return project.uri;
    }
}

export class Projects {

    protected readonly context: vscode.ExtensionContext;

    private projectEmitter = new vscode.EventEmitter<Project | Project[] | undefined>();
    private inputFileEmitter = new vscode.EventEmitter<ProjectFile | ProjectFile[] | undefined>();
    private outputFileEmitter = new vscode.EventEmitter<ProjectFile | ProjectFile[] | undefined>();

    private projects: Project[];
    private currentProject?: Project;

    private disposables: vscode.Disposable[];

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.projects = [];

        this.disposables = [vscode.tasks.onDidEndTask(this.handleTaskEnd.bind(this))];
    }

    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
    }

    getProjectEmitter() {
        return this.projectEmitter;
    }

    getInputFileEmitter() {
        return this.inputFileEmitter;
    }

    getOutputFileEmitter() {
        return this.outputFileEmitter;
    }

    emitProjectChange(changed: Project | Project[] | undefined = undefined) {
        this.projectEmitter.fire(changed);
    }

    emitInputFileChange(changed: ProjectFile | ProjectFile[] | undefined = undefined) {
        this.inputFileEmitter.fire(changed);
    }

    emitOutputFileChange(changed: ProjectFile | ProjectFile[] | undefined = undefined) {
        this.outputFileEmitter.fire(changed);
    }

    getAll() {
        return this.projects;
    }

    has(uri: vscode.Uri) {
        return this.projects.some((project) => project.isUri(uri));
    }

    get(uri: vscode.Uri) {
        return this.projects.find((project) => project.isUri(uri));
    }

    async add(uri: vscode.Uri, shouldSetCurrent: boolean, shouldCreate: boolean): Promise<Project> {
        let project: Project | undefined;

        if (!this.has(uri)) {
            if (shouldCreate) {
                project = new Project(this, uri);
                await Project.store(project);
            } else {
                project = await Project.load(this, uri);
            }

            this.projects.push(project);
        }

        await this.store(false);

        if (!project) {
            throw new Error(`Failed to open project "${uri.toString()}".`);
        }

        if (shouldSetCurrent) {
            this.setCurrent(project);
        }

        return project;
    }

    async remove(uri: vscode.Uri) {
        this.projects = this.projects.filter((project) => !project.isUri(uri));

        await this.store(false);

        if (this.currentProject && this.currentProject.getUri().toString() === uri.toString()) {
            if (this.projects.length > 0) {
                this.setCurrent(this.projects[0]);
            } else {
                this.clearCurrent();
            }
        }
    }

    async load() {
        try {
            let projectUris = this.context.workspaceState.get<string[] | undefined>('projects');
            if (!projectUris) {
                projectUris = [];
            }

            this.projects = [];
            for (const projectUri of projectUris) {
                const project = await Project.load(this, vscode.Uri.parse(projectUri));

                this.projects.push(project);
            }
        } catch (err) {
            this.context.workspaceState.update('projects', undefined);

            throw err;
        }

        this.emitProjectChange();

        if (this.projects.length > 0) {
            this.setCurrent(this.projects[0]);
        }
    }

    async store(full: boolean = true) {
        const projectUris = [];
        for (const project of this.projects) {
            const projectUri = full ? await Project.store(project) : project.getUri();
            projectUris.push(projectUri);
        }

        await this.context.workspaceState.update('projects', projectUris.map((uri) => uri.toString()));

        this.emitProjectChange();
    }

    async reload(uri: vscode.Uri) {
        const index = this.projects.findIndex((project) => project.getUri().toString() === uri.toString());
        const project = this.projects[index];

        if (index !== -1) {
            const newProject = await Project.load(this, uri);

            this.projects.splice(index, 1, newProject);

            if (this.currentProject === project) {
                this.setCurrent(newProject);
            }

            this.emitProjectChange();
            this.emitInputFileChange();
            this.emitOutputFileChange();
        }
    }

    getCurrent() {
        return this.currentProject;
    }

    async setCurrent(project: Project) {
        const previousProject = this.currentProject;
        this.currentProject = project;

        this.emitProjectChange(previousProject ? [previousProject, this.currentProject] : this.currentProject);
        this.emitInputFileChange();
        this.emitOutputFileChange();
    }

    clearCurrent() {
        const previousProject = this.currentProject;
        this.currentProject = undefined;

        this.emitProjectChange(previousProject ? previousProject : undefined);
        this.emitInputFileChange();
        this.emitOutputFileChange();
    }

    handleTaskEnd(event: vscode.TaskEndEvent) {
        const task = event.execution.task;

        if (['yosys', 'nextpnr'].includes(task.definition.type)) {
            if (task.scope === undefined || task.scope === vscode.TaskScope.Global || task.scope === vscode.TaskScope.Workspace) {
                return;
            }

            const uri = vscode.Uri.joinPath(task.scope.uri, task.definition.project);
            this.reload(uri);
        }
    }
}
