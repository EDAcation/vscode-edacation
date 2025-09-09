import * as vscode from 'vscode';

import type {Project} from '../projects/index.js';
import {type InputFileTreeItem, type OutputFileTreeItem} from '../trees/files.js';
import {FILE_FILTERS_HDL} from '../util.js';

import {CurrentProjectCommand} from './base.js';

export class AddInputFileCommand extends CurrentProjectCommand {
    static getID() {
        return 'edacation.addInputFile';
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

        await project.addInputFileUris(fileUris);
    }
}

export class NewInputFileCommand extends CurrentProjectCommand {
    static getID() {
        return 'edacation.newInputFile';
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
        await project.addInputFileUris([fileUri]);

        // Open file
        await vscode.commands.executeCommand('vscode.open', fileUri);
    }
}

export class RemoveInputFileCommand extends CurrentProjectCommand {
    static getID() {
        return 'edacation.removeInputFile';
    }

    async executeForCurrentProject(project: Project, treeItem: InputFileTreeItem) {
        if (treeItem.type !== 'file') {
            await vscode.window.showErrorMessage('Input file removal is not supported for this item');
            return;
        }
        project.removeInputFiles([treeItem.file.path]);
    }
}

export class SetInputFileTypeCommand extends CurrentProjectCommand {
    static getID() {
        return 'edacation.setInputFileType';
    }

    async executeForCurrentProject(project: Project, treeItem: InputFileTreeItem) {
        if (treeItem.type !== 'file') {
            await vscode.window.showErrorMessage('Input file type switching is not supported for this item');
            return;
        }

        if (treeItem.category === 'design') {
            return project.setInputFileType(treeItem.file.path, 'testbench');
        } else if (treeItem.category === 'testbench') {
            return project.setInputFileType(treeItem.file.path, 'design');
        }

        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Invalid previous category: ${treeItem.category}`);
    }
}

export class RemoveOutputFileCommand extends CurrentProjectCommand {
    static getID() {
        return 'edacation.removeOutputFile';
    }

    async executeForCurrentProject(project: Project, treeItem: OutputFileTreeItem) {
        if (treeItem.type !== 'file') {
            await vscode.window.showErrorMessage('Output file removal is not supported for this item');
            return;
        }

        project.removeOutputFiles([treeItem.file.path]);
    }
}

export class TrashOutputFileCommand extends CurrentProjectCommand {
    static getID() {
        return 'edacation.trashOutputFile';
    }

    async executeForCurrentProject(project: Project, treeItem: OutputFileTreeItem) {
        if (treeItem.type !== 'file') {
            await vscode.window.showErrorMessage('Output file trashing is not supported for this item');
            return;
        }

        project.removeOutputFiles([treeItem.file.path]);

        try {
            const uri = project.getFileUri(treeItem.file.path);
            await vscode.workspace.fs.delete(uri);
        } catch {
            return;
        }
    }
}
