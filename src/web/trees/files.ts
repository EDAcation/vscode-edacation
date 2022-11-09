import * as vscode from 'vscode';

import {BaseTreeDataProvider} from './base';

interface ProjectFile {

}

export class FilesProvider extends BaseTreeDataProvider<ProjectFile> {

    static getViewID() {
        return 'edacation-files';
    }

    getTreeItem(element: ProjectFile): vscode.TreeItem {
        return {
            label: ''
        };
    }

    async getChildren(element?: ProjectFile): Promise<ProjectFile[]> {
        return [];
    }
}
