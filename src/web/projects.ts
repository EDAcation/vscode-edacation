import * as vscode from 'vscode';

import {decodeJSON, encodeJSON, getFileName} from './util';

export type ProjectFile = vscode.Uri;

export class Project {

    private readonly projects: Projects;

    private uri: vscode.Uri;
    private root: vscode.Uri;
    private name: string;
    private files: vscode.Uri[];

    constructor(projects: Projects, uri: vscode.Uri, root: vscode.Uri, name?: string, files: vscode.Uri[] = []) {
        this.projects = projects;

        this.uri = uri;
        this.root = root;
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

    hasFile(uri: vscode.Uri) {
        return this.files.some((file) => file.toString() === uri.toString());
    }

    async addFiles(fileUris: vscode.Uri[]) {
        for (const fileUri of fileUris) {
            if (!this.hasFile(fileUri)) {
                this.files.push(fileUri);
            }
        }

        this.sortFiles();

        this.projects.emitFileChange();

        await this.save();
    }

    async removeFiles(fileUris: vscode.Uri[]) {
        this.files = this.files.filter((file) => !fileUris.some((fileUri) => fileUri.toString() === file.toString()));

        this.projects.emitFileChange();

        await this.save();
    }

    sortFiles() {
        this.files.sort((a, b) => {
            const nameA = a.path.replace(`${this.getRoot().path}/`, '');
            const nameB = b.path.replace(`${this.getRoot().path}/`, '');
            return nameA < nameB ? -1 : 1;
        });
    }

    private async save() {
        await Project.store(this);
    }

    static serialize(project: Project): any {
        return {
            uri: project.uri.toString(),
            root: project.root.toString(),
            name: project.name,
            files: project.files.map((file) => file.toString())
        };
    }

    static deserialize(projects: Projects, data: any): Project {
        const uri = vscode.Uri.parse(data.uri);
        const root = vscode.Uri.parse(data.root);
        const name: string = data.name;
        const files: vscode.Uri[] = data.files ? data.files.map((fileData: string) => vscode.Uri.parse(fileData)) : [];

        return new Project(projects, uri, root, name, files);
    }

    static async load(projects: Projects, uri: vscode.Uri): Promise<Project> {
        const data = decodeJSON(await vscode.workspace.fs.readFile(uri));
        data.uri = uri;
        const project = Project.deserialize(projects, data);
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
    private fileEmitter = new vscode.EventEmitter<ProjectFile | ProjectFile[] | undefined>();

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

    emitFileChange(changed: ProjectFile | ProjectFile[] | undefined = undefined) {
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

    async add(uri: vscode.Uri, shouldSetCurrent: boolean, shouldCreate: false): Promise<Project>;
    async add(uri: vscode.Uri, shouldSetCurrent: boolean, shouldCreate: true, root: vscode.Uri): Promise<Project>;
    async add(uri: vscode.Uri, shouldSetCurrent: boolean, shouldCreate: boolean, root?: vscode.Uri): Promise<Project> {
        let project: Project | undefined;

        if (!this.has(uri)) {
            if (shouldCreate) {
                if (!root) {
                    throw new Error('Missing project root.');
                }

                project = new Project(this, uri, root);
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
