import * as vscode from 'vscode';

import {Project, Projects} from '../projects';
import {BaseTreeDataProvider} from './base';

export class ProjectProvider extends BaseTreeDataProvider<Project> {


    constructor(context: vscode.ExtensionContext, projects: Projects) {
        super(context, projects);

        this.onDidChangeTreeData = projects.getEmitter().event;
    }

    static getViewID() {
        return 'edacation-projects';
    }

    getTreeItem(element: Project): vscode.TreeItem {
        return {
            label: element.uri.path.substring(element.uri.path.lastIndexOf('/') + 1),
            iconPath: vscode.ThemeIcon.Folder,
            collapsibleState: vscode.TreeItemCollapsibleState.None
        };
    }

    async getChildren(element?: Project): Promise<Project[]> {
        if (!element) {
            return this.projects.get();
        }

        return [];
    }
}
