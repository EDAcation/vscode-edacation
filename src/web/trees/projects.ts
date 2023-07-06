import * as vscode from 'vscode';

import type {Project, Projects} from '../projects/index.js';

import {BaseTreeDataProvider} from './base.js';

export class ProjectProvider extends BaseTreeDataProvider<Project> {
    constructor(context: vscode.ExtensionContext, projects: Projects) {
        super(context, projects);

        this.onDidChangeTreeData = projects.getProjectEmitter().event;
    }

    static getViewID() {
        return 'edacation-projects';
    }

    getTreeItem(element: Project): vscode.TreeItem {
        return {
            label: `${element.getName()}${this.projects.getCurrent() === element ? ' (current)' : ''}`,
            iconPath: vscode.ThemeIcon.Folder,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
                command: 'edacation.selectProject',
                arguments: [element],
                title: 'Select project'
            }
        };
    }

    async getChildren(element?: Project): Promise<Project[]> {
        if (!element) {
            return this.projects.getAll();
        }

        return [];
    }
}
