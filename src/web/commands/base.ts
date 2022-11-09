import * as vscode from 'vscode';

import {Projects} from '../projects';

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
