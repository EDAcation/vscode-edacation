import {type Project} from 'edacation';
import * as vscode from 'vscode';

import type {Projects} from '../projects/index.js';

import {BaseTreeDataProvider} from './base.js';

export class ProjectProvider extends BaseTreeDataProvider<Project> {
    constructor(context: vscode.ExtensionContext, projects: Projects) {
        super(context, projects);

        this.projectEventChannel.subscribe((_msg) => this.changeEmitter.fire(undefined));
        this.openProjectsChannel.subscribe((_msg) => this.changeEmitter.fire(undefined));
    }

    static getViewID() {
        return 'edacation-projects';
    }

    getTreeItem(element: Project): vscode.TreeItem {
        const isCurrent = this.projects.getCurrent() === element;
        return {
            label: element.getName(),
            description: isCurrent ? '(current)' : undefined,
            iconPath: vscode.ThemeIcon.Folder,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
                command: 'edacation.selectProject',
                arguments: [element],
                title: 'Select project'
            }
        };
    }

    getChildren(element?: Project): Project[] {
        if (!element) {
            return this.projects.getAll();
        }

        return [];
    }
}
