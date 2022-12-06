import path from 'path';
import * as vscode from 'vscode';

import {decodeJSON, encodeJSON, getFileName} from './util';

export class Project {

    private readonly projects: Projects;

    private uri: vscode.Uri;
    private root: vscode.Uri;
    private name: string;
    private files: string[];

    constructor(projects: Projects, uri: vscode.Uri, name?: string, files: string[] = []) {
        this.projects = projects;

        this.uri = uri;
        this.root = this.uri.with({
            path: path.dirname(this.uri.path)
        });
        this.name = name ? name : getFileName(this.uri, false);
        this.files = files;
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

    getFiles() {
        return this.files;
    }

    getFilesAsUris() {
        return this.files.map((file) => vscode.Uri.joinPath(this.getRoot(), file));
    }

    hasFile(file: string) {
        return this.files.includes(file);
    }

    async addFiles(fileUris: vscode.Uri[]) {
        for (const fileUri of fileUris) {
            if (!fileUri.path.startsWith(this.getRoot().path)) {
                await vscode.window.showErrorMessage(`File "${fileUri.path}" must be in the a subfolder of the EDA project root.`);
                continue;
            }

            const relativeFileUri = fileUri.path.replace(this.getRoot().path, '.');
            console.log(fileUri, relativeFileUri);

            if (!this.hasFile(relativeFileUri)) {
                this.files.push(relativeFileUri);
            }
        }

        this.files.sort();

        this.projects.emitFileChange();

        await this.save();
    }

    async removeFiles(fileUris: string[]) {
        this.files = this.files.filter((file) => !fileUris.includes(file));

        this.projects.emitFileChange();

        await this.save();
    }

    private async save() {
        await Project.store(this);
    }

    static serialize(project: Project): any {
        return {
            uri: project.uri.toString(),
            name: project.name,
            files: project.files.map((file) => file.toString())
        };
    }

    static deserialize(projects: Projects, uri: vscode.Uri, data: any): Project {
        const name: string = data.name;
        const files: string[] = data.files ?? [];

        return new Project(projects, uri, name, files);
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
    private fileEmitter = new vscode.EventEmitter<string | string[] | undefined>();

    private projects: Project[];
    private currentProject?: Project;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.projects = [];
    }

    getProjectEmitter() {
        return this.projectEmitter;
    }

    getFileEmitter() {
        return this.fileEmitter;
    }

    emitProjectChange(changed: Project | Project[] | undefined = undefined) {
        this.projectEmitter.fire(changed);
    }

    emitFileChange(changed: string | string[] | undefined = undefined) {
        this.fileEmitter.fire(changed);
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

    getCurrent() {
        return this.currentProject;
    }

    async setCurrent(project: Project) {
        const previousProject = this.currentProject;
        this.currentProject = project;

        this.emitProjectChange(previousProject ? [previousProject, this.currentProject] : this.currentProject);
        this.emitFileChange();
    }

    clearCurrent() {
        const previousProject = this.currentProject;
        this.currentProject = undefined;

        this.emitProjectChange(previousProject ? previousProject : undefined);
        this.emitFileChange();
    }
}
