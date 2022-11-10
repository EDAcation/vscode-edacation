import * as vscode from 'vscode';

import {decodeJSON, encodeJSON} from './util';

export class Project {

    private uri: vscode.Uri;
    private name: string;
    private files: vscode.Uri[];

    constructor(uri: vscode.Uri, name?: string, files: vscode.Uri[] = []) {
        this.uri = uri;
        this.name = name ? name : this.uri.path.substring(this.uri.path.lastIndexOf('/') + 1, this.uri.path.lastIndexOf('.edaproject'));
        this.files = files;
    }

    getUri() {
        return this.uri;
    }

    isUri(uri: vscode.Uri) {
        return this.uri.toString() === uri.toString();
    }

    getName() {
        return this.name;
    }

    getFiles() {
        return this.files;
    }

    private static serialize(project: Project): any {
        return {
            uri: project.uri.toString(),
            name: project.name,
            files: project.files.map((file) => file.toString())
        };
    }

    private static deserialize(data: any): Project {
        const uri = vscode.Uri.parse(data.uri);
        const name = data.name;
        const files = data.files ? data.files.map((fileData: string) => vscode.Uri.parse(fileData)) : [];

        return new Project(uri, name, files);
    }

    static async load(uri: vscode.Uri): Promise<Project> {
        const data = decodeJSON(await vscode.workspace.fs.readFile(uri));
        data.uri = uri;
        const project = Project.deserialize(data);
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
    private emitter = new vscode.EventEmitter<Project | Project[] | undefined>();
    private projects: Project[];
    private currentProject?: Project;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.projects = [];
    }

    getEmitter() {
        return this.emitter;
    }

    private emitChange(changed: Project | Project[] | undefined = undefined) {
        this.emitter.fire(changed);
    }

    get() {
        return this.projects;
    }

    async load() {
        try {
            let projectUris = this.context.workspaceState.get<string[] | undefined>('projects');
            if (!projectUris) {
                projectUris = [];
            }

            this.projects = [];
            for (const projectUri of projectUris) {
                const project = await Project.load(vscode.Uri.parse(projectUri));

                this.projects.push(project);
            }
        } catch (err) {
            this.context.workspaceState.update('projects', undefined);

            throw err;
        }

        this.emitChange();
    }

    async store(full: boolean = true) {
        const projectUris = [];
        for (const project of this.projects) {
            const projectUri = full ? await Project.store(project) : project.getUri();
            projectUris.push(projectUri);
        }

        await this.context.workspaceState.update('projects', projectUris.map((uri) => uri.toString()));
    }

    async add(uri: vscode.Uri, shouldLoad: boolean) {
        if (!this.projects.some((project) => project.isUri(uri))) {
            if (shouldLoad) {
                this.projects.push(await Project.load(uri));
            } else {
                const project = new Project(uri);
                await Project.store(project);
                this.projects.push(project);
            }
        }

        await this.store(false);

        this.emitChange();
    }

    async remove(uri: vscode.Uri) {
        this.projects = this.projects.filter((project) => !project.isUri(uri));

        await this.store(false);

        this.emitChange();
    }

    getCurrent() {
        return this.currentProject;
    }

    async setCurrent(project: Project) {
        this.currentProject = project;
    }

    clearCurrent() {
        this.currentProject = undefined;
    }
}
