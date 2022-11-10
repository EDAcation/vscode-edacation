import * as vscode from 'vscode';

import {ProjectEditor} from '../editors/project';
import {Project} from '../projects';
import {ensureFileAbsent} from '../util';
import {BaseCommand} from './base';

export class NewProjectCommand extends BaseCommand {

    static getID() {
        return 'edacation.newProject';
    }

    async execute() {
        let projectName: string;
            let projectLocation: vscode.Uri;

            // Ask for project name
            const name = await vscode.window.showInputBox({
                title: 'New EDA Project',
                prompt: 'Choose a name for the new project.'
            });
            if (!name) {
                return;
            }
            projectName = name;

            // Ask for project location
            type Item = vscode.QuickPickItem & {uri?: vscode.Uri};
            const items = (vscode.workspace.workspaceFolders || [])
                .map((folder) => ({
                    uri: folder.uri,
                    label: `$(folder) ${folder.name}`,
                    description: folder.uri.fsPath
                }) as Item)
                .concat([{
                    label: '$(folder-opened) Browse...',
                    description: ''
                }]);

            const selection = await vscode.window.showQuickPick(items, {
                title: 'Choose EDA Project Location'
            });
            if (!selection) {
                return;
            }

            if (selection.uri) {
                projectLocation = selection.uri;
            } else {
                // Ask for folder
                const folderUris = await vscode.window.showOpenDialog({
                    title: 'Choose EDA Project Location',
                    canSelectFiles: false,
                    canSelectFolders: true,
                    canSelectMany: false,
                });

                if (!folderUris || folderUris.length === 0) {
                    return;
                }

                projectLocation = folderUris[0];
            }

            // Determine project URI
            const projectUri = vscode.Uri.joinPath(projectLocation, projectName.endsWith('.edaproject') ? projectName : `${projectName}.edaproject`);

            // Ensure the project file does not exist
            await ensureFileAbsent(projectUri);

            // Add project
            await this.projects.add(projectUri, false);

            // Open project file
            vscode.commands.executeCommand('vscode.openWith', projectUri, ProjectEditor.getViewType());
    }
}

export class OpenProjectCommand extends BaseCommand {

    static getID() {
        return 'edacation.openProject';
    }

    async execute() {
        const fileUris = await vscode.window.showOpenDialog({
            title: 'Open EDA Project',
            canSelectFolders: false,
            canSelectFiles: true,
            canSelectMany: false,
            filters: {
                /* eslint-disable-next-line @typescript-eslint/naming-convention */
                'EDA Projects (*.edaproject)': ['edaproject'],
            }
        });

        if (!fileUris || fileUris.length === 0) {
            return;
        }
        const projectUri = fileUris[0];

        // Add project
        await this.projects.add(projectUri, true);

        // Open project file
        vscode.commands.executeCommand('vscode.openWith', projectUri, ProjectEditor.getViewType());
    }
}

export class CloseProject extends BaseCommand {

    static getID() {
        return 'edacation.closeProject';
    }

    async execute(project: Project) {
        await this.projects.remove(project.getUri());
    }
}

export class SelectProject extends BaseCommand {

    static getID() {
        return 'edacation.selectProject';
    }

    async execute(project: Project) {
        await this.projects.setCurrent(project);
    }
}
