import * as vscode from 'vscode';
import {Project, ProjectFile} from '../projects';

import {CurrentProjectCommand} from './base';

export class AddFileCommand extends CurrentProjectCommand {

    static getID() {
        return 'edacation.addFile';
    }

    async executeForCurrentProject(project: Project) {
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

export class RemoveFileCommand extends CurrentProjectCommand {

    static getID() {
        return 'edacation.removeFile';
    }

    async executeForCurrentProject(project: Project, file: ProjectFile) {
        await project.removeFiles([file]);
    }
}
