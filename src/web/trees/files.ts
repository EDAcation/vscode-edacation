import * as vscode from 'vscode';

import {ProjectFile, Projects} from '../projects';
import {getFileName} from '../util';
import {BaseTreeDataProvider} from './base';

export class FilesProvider extends BaseTreeDataProvider<ProjectFile> {

    constructor(context: vscode.ExtensionContext, projects: Projects) {
        super(context, projects);

        this.onDidChangeTreeData = projects.getFileEmitter().event;
    }

    static getViewID() {
        return 'edacation-files';
    }


    getTreeItem(element: ProjectFile): vscode.TreeItem {
        const project = this.projects.getCurrent();
        if (!project) {
            throw new Error('Invalid state.');
        }

        return {
            label: element.path.replace(`${project.getRoot().path}/`, ''),
            iconPath: vscode.ThemeIcon.File,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
                title: 'Open file',
                command: 'vscode.open',
                arguments: [element]
            }
        };
    }

    async getChildren(element?: ProjectFile): Promise<ProjectFile[]> {
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
