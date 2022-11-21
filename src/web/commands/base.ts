import * as vscode from 'vscode';

import {Project, Projects} from '../projects';

export abstract class BaseCommand {

    protected readonly context: vscode.ExtensionContext;
    protected readonly projects: Projects;

    constructor(context: vscode.ExtensionContext, projects: Projects) {
        this.context = context;
        this.projects = projects;
    }

    static getID(): string {
        throw new Error('Not implemented.');
    }

    abstract execute(...args: unknown[]): Promise<void>;
}

export abstract class CurrentProjectCommand extends BaseCommand {

    abstract executeForCurrentProject(project: Project, ...args: unknown[]): Promise<void>;

    async execute(...args: unknown[]) {
        const project = this.projects.getCurrent();
        if (!project) {
            vscode.window.showWarningMessage('No EDA project selected.');
            return;
        }

        await this.executeForCurrentProject(project, ...args);
    }
}
