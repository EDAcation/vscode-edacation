import * as vscode from 'vscode';

import {Projects} from '../projects';
import {BaseTreeDataProvider} from './base';

export class FilesProvider extends BaseTreeDataProvider<string> {

    constructor(context: vscode.ExtensionContext, projects: Projects) {
        super(context, projects);

        this.onDidChangeTreeData = projects.getFileEmitter().event;
    }

    static getViewID() {
        return 'edacation-files';
    }


    getTreeItem(element: string): vscode.TreeItem {
        const project = this.projects.getCurrent();
        if (!project) {
            throw new Error('Invalid state.');
        }

        return {
            label: element.startsWith('./') ? element.substring(2) : element,
            iconPath: vscode.ThemeIcon.File,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
                title: 'Open file',
                command: 'vscode.open',
                arguments: [element]
            }
        };
    }

    async getChildren(element?: string): Promise<string[]> {
        const project = this.projects.getCurrent();
        if (!project) {
            return [];
        }

        if (!element) {
            return project.getFiles();
        }

        return [];
    }
}
