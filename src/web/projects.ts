import * as vscode from 'vscode';

export const DEFAULT_PROJECT_SETTINGS: Partial<Project> = {};

export interface Project {
    uri: vscode.Uri;
}

export class Projects {

    protected readonly context: vscode.ExtensionContext;
    private emitter = new vscode.EventEmitter<Project | Project[] | undefined>();
    private projects: Project[];

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.projects = [];
    }

    getEmitter() {
        return this.emitter;
    }

    get() {
        return this.projects;
    }

    load() {
        try {
            let projectUris = this.context.workspaceState.get<string[] | undefined>('projects');
            if (!projectUris) {
                projectUris = [];
            }
            this.projects = projectUris.map((uri) => ({
                uri: vscode.Uri.parse(uri)
            }));
        } catch (err) {
            this.context.workspaceState.update('projects', undefined);

            throw err;
        }
    }

    async store() {
        const projectUris = this.projects.map((project) => project.uri.toString());
        await this.context.workspaceState.update('projects', projectUris);

        // Signal that the root has changed
        this.emitter.fire(undefined);
    }

    async add(uri: vscode.Uri) {
        this.load();

        if (!this.projects.some((project) => project.uri.toString() === uri.toString())) {
            this.projects = this.projects.concat([{
                uri
            }]);
        }

        await this.store();
    }

    async remove(uri: vscode.Uri) {
        this.load();

        this.projects = this.projects.filter((project) => project.uri.toString() !== uri.toString());

        await this.store();
    }
}
