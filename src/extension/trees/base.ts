import type * as vscode from 'vscode';

import type {Projects} from '../projects/index.js';

export abstract class BaseTreeDataProvider<T> implements vscode.TreeDataProvider<T> {
    protected readonly context: vscode.ExtensionContext;
    protected readonly projects: Projects;

    onDidChangeTreeData?: vscode.Event<T | T[] | undefined>;

    constructor(context: vscode.ExtensionContext, projects: Projects) {
        this.context = context;
        this.projects = projects;
    }

    static getViewID(): string {
        throw new Error('Not implemented.');
    }

    abstract getTreeItem(element: T): vscode.TreeItem | Thenable<vscode.TreeItem>;

    abstract getChildren(element?: T | undefined): vscode.ProviderResult<T[]>;
}
