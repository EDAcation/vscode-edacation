import * as vscode from 'vscode';

import {Project, ProjectFile} from '../projects';
import {FILE_FILTERS_HDL} from '../util';
import {CurrentProjectCommand} from './base';

export class AddFileCommand extends CurrentProjectCommand {

    static getID() {
        return 'edacation.addFile';
    }

    async executeForCurrentProject(project: Project) {
        const fileUris = await vscode.window.showOpenDialog({
            title: 'Open File',
            canSelectFolders: false,
            canSelectFiles: true,
            canSelectMany: true,
            filters: FILE_FILTERS_HDL
        });

        if (!fileUris || fileUris.length === 0) {
            return;
        }

        await project.addFiles(fileUris);
    }
}

export class NewFileCommand extends CurrentProjectCommand {

    static getID() {
        return 'edacation.newFile';
    }

    async executeForCurrentProject(project: Project) {
        const fileUri = await vscode.window.showSaveDialog({
            title: 'New File',
            filters: FILE_FILTERS_HDL
        });

        if (!fileUri) {
            return;
        }

        // Create file
        await vscode.workspace.fs.writeFile(fileUri, new Uint8Array());

        // Add file to project
        await project.addFiles([fileUri]);

        // Open file
        await vscode.commands.executeCommand('vscode.open', fileUri);
    }
}


export class RemoveFileCommand extends CurrentProjectCommand {

    static getID() {
        return 'edacation.removeFile';
    }

    async executeForCurrentProject(project: Project, file: ProjectFile) {
        await project.removeFiles([file]);
    }
}
