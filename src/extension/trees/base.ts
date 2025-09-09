import * as vscode from 'vscode';

import {type OpenProjectsChannel, type ProjectEventChannel} from '../../exchange.js';
import type {Projects} from '../projects/index.js';

export abstract class BaseTreeDataProvider<T> implements vscode.TreeDataProvider<T> {
    protected readonly context: vscode.ExtensionContext;
    protected readonly projects: Projects;
    protected readonly projectEventChannel: ProjectEventChannel;
    protected readonly openProjectsChannel: OpenProjectsChannel;

    protected readonly changeEmitter = new vscode.EventEmitter<T | T[] | undefined>();
    onDidChangeTreeData = this.changeEmitter.event;

    constructor(context: vscode.ExtensionContext, projects: Projects) {
        this.context = context;
        this.projects = projects;
        this.projectEventChannel = this.projects.createProjectEventChannel();
        this.openProjectsChannel = this.projects.createOpenProjectsChannel();
    }

    static getViewID(): string {
        throw new Error('Not implemented.');
    }

    abstract getTreeItem(element: T): vscode.TreeItem | Thenable<vscode.TreeItem>;

    abstract getChildren(element?: T  ): vscode.ProviderResult<T[]>;
}
