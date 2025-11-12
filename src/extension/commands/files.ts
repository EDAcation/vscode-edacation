import type {ProjectInputFile} from 'edacation';
import * as vscode from 'vscode';

import type {Project} from '../projects/index.js';
import {type InputFileTreeItem, type OutputFileTreeItem} from '../trees/files.js';
import {FILE_FILTERS_INPUT} from '../util.js';

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
            filters: FILE_FILTERS_INPUT
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
            filters: FILE_FILTERS_INPUT
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
    private static readonly categories: Record<string, ProjectInputFile['type']> = {
        'Design File': 'design',
        'Testbench File': 'testbench',
        'Pin Configuration File': 'pinconfig'
    };

    static getID() {
        return 'edacation.setInputFileType';
    }

    async executeForCurrentProject(project: Project, treeItem: InputFileTreeItem, selectedItems?: InputFileTreeItem[]) {
        const items = selectedItems && selectedItems.length > 0 ? selectedItems : [treeItem];
        const files = items
            .filter((item) => item.type === 'file')
            .flatMap((item) => {
                const file = project.getInputFile(item.file.path);
                return file ? [file] : [];
            });

        if (files.length === 0) {
            await vscode.window.showErrorMessage('No input files selected');
            return;
        }

        const options: vscode.QuickPickItem[] = Object.entries(SetInputFileTypeCommand.categories).map(
            ([label, _category]) => ({label})
        );

        const item = await vscode.window.showQuickPick(options, {
            title: 'Select a new type for this input file',
            canPickMany: false
        });
        if (!item) return;

        const category = SetInputFileTypeCommand.categories[item.label];
        for (const file of files) {
            if (file.type === category) continue;
            file.type = category;
        }
    }
}

export class SetInputFileActiveCommand extends CurrentProjectCommand {
    static getID() {
        return 'edacation.setInputFileActive';
    }

    async executeForCurrentProject(project: Project, treeItem: InputFileTreeItem) {
        const target = project.getActiveTarget();

        if (!target) {
            await vscode.window.showErrorMessage('No active target set in project');
            return;
        }
        if (treeItem.type !== 'file') {
            await vscode.window.showErrorMessage('Setting active input file is not supported for this item');
            return;
        }

        if (treeItem.category === 'testbench') {
            project.setActiveTestbenchPath(target.id, treeItem.file.path);
        } else if (treeItem.category === 'pinconfig') {
            project.setActivePinConfigPath(target.id, treeItem.file.path);
        } else {
            await vscode.window.showErrorMessage(
                'Setting active input file is only supported for testbench and pin configuration files'
            );
        }
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
