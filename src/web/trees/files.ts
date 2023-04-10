import * as vscode from 'vscode';

import {Project, ProjectFile, Projects} from '../projects';
import {BaseTreeDataProvider} from './base';

abstract class FilesProvider extends BaseTreeDataProvider<ProjectFile> {

    getTreeItem(element: ProjectFile): vscode.TreeItem {
        const project = this.projects.getCurrent();
        if (!project) {
            throw new Error('Invalid state.');
        }

        return {
            label: element.path.startsWith('./') ? element.path.substring(2) : element.path,
            iconPath: vscode.ThemeIcon.File,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
                title: 'Open file',
                command: 'vscode.open',
                arguments: [element.uri]
            }
        };
    }

    async getChildren(element?: ProjectFile): Promise<ProjectFile[]> {
        const project = this.projects.getCurrent();
        if (!project) {
            return [];
        }

        if (!element) {
            return this.getFiles(project);
        }

        return [];
    }

    abstract getFiles(project: Project): ProjectFile[];
}

export class InputFilesProvider extends FilesProvider {

    static getViewID() {
        return 'edacation-inputFiles';
    }

    constructor(context: vscode.ExtensionContext, projects: Projects) {
        super(context, projects);

        this.onDidChangeTreeData = projects.getInputFileEmitter().event;
    }

    getFiles(project: Project) {
        return project.getInputFileUris();
    }
}

export class OutputFilesProvider extends FilesProvider {

    static getViewID() {
        return 'edacation-outputFiles';
    }

    constructor(context: vscode.ExtensionContext, projects: Projects) {
        super(context, projects);

        this.onDidChangeTreeData = projects.getOutputFileEmitter().event;
    }

    getFiles(project: Project) {
        return project.getOutputFileUris();
    }
}
