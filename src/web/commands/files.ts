import * as vscode from 'vscode';
import {ProjectFile} from '../projects';

import {BaseCommand} from './base';

export class AddFileCommand extends BaseCommand {

    static getID() {
        return 'edacation.addFile';
    }

    async execute() {
        const project = this.projects.getCurrent();
        if (!project) {
            vscode.window.showWarningMessage('No EDA project selected.');
            return;
        }

        const fileUris = await vscode.window.showOpenDialog({
            title: 'Open EDA Project',
            canSelectFolders: false,
            canSelectFiles: true,
            canSelectMany: true,
            filters: {
                /* eslint-disable-next-line @typescript-eslint/naming-convention */
                'HDL (*.v, *.vh, *.sv, *.svh, *.vhd)': ['v', 'vh', 'sv', 'svh', 'vhd'],
            }
        });

        if (!fileUris || fileUris.length === 0) {
            return;
        }

        await project.addFiles(fileUris);
    }
}

export class RemoveFileCommand extends BaseCommand {

    static getID() {
        return 'edacation.removeFile';
    }

    async execute(file: ProjectFile) {
        const project = this.projects.getCurrent();
        if (!project) {
            vscode.window.showWarningMessage('No EDA project selected.');
            return;
        }

        await project.removeFiles([file]);
    }
}
