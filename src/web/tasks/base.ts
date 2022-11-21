import * as vscode from 'vscode';

import {Projects} from '../projects';

export abstract class BaseTaskProvider<T extends vscode.Task = vscode.Task> implements vscode.TaskProvider<T> {

    protected readonly context: vscode.ExtensionContext;
    protected readonly projects: Projects;

    constructor(context: vscode.ExtensionContext, projects: Projects) {
        this.context = context;
        this.projects = projects;
    }

    static getType(): string {
        throw new Error('Not implemented.');
    }

    abstract provideTasks(token: vscode.CancellationToken): Promise<T[]>;

    abstract resolveTask(task: T, token: vscode.CancellationToken): Promise<T | undefined>;
}
