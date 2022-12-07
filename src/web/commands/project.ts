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
        let projectWorkspace: vscode.Uri;
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

        // Ask for project workspace
        type WorkspaceItem = vscode.QuickPickItem & {uri?: vscode.Uri};
        const workspaceItems = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0 ? vscode.workspace.workspaceFolders
            .map((folder) => ({
                uri: folder.uri,
                label: `$(folder) ${folder.name}`,
                description: folder.uri.fsPath
            }) as WorkspaceItem) : [{
                label: `$(error) No workspace folders available`,
                description: 'Please add a folder to the workspace before using EDA projects.'
            }];

        const workspaceSelection = await vscode.window.showQuickPick(workspaceItems, {
            title: 'Choose EDA Project Workspace',
            canPickMany: false
        });
        if (!workspaceSelection || !workspaceSelection.uri) {
            return;
        }

        projectWorkspace = workspaceSelection.uri;

        // Ask for project location
        type FolderItem = vscode.QuickPickItem & {key: 'root' | 'browse'};
        const folderItems = [{
            key: 'root',
            label: '$(folder) Workspace Folder Root',
            description: projectWorkspace.fsPath
        }, {
            key: 'browse',
            label: '$(folder-opened) Browse...',
            description: ''
        }] as FolderItem[];

        const folderSelection = await vscode.window.showQuickPick(folderItems, {
            title: 'Choose EDA Project Location',
            canPickMany: false
        });
        if (!folderSelection) {
            return;
        }

        if (folderSelection.key === 'root') {
            projectLocation = projectWorkspace;
        } else {
            // Ask for project location
            const folderUris = await vscode.window.showOpenDialog({
                title: 'Choose EDA Project Location',
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                defaultUri: projectWorkspace
            });
    
            if (!folderUris || folderUris.length === 0) {
                return;
            }
    
            projectLocation = folderUris[0];
        }

        // Determine project URI
        const projectUri = vscode.Uri.joinPath(projectLocation, projectName.endsWith('.edaproject') ? projectName : `${projectName}.edaproject`);

        // Check if folder is within workspace folder
        if (!projectUri.path.startsWith(projectWorkspace.path)) {
            console.log(projectWorkspace.path, projectUri.path);
            vscode.window.showErrorMessage('Selected project location must be within the selected workspace folder.');
            return;
        }

        // Ensure the project file does not exist
        await ensureFileAbsent(projectUri);

        // Add project
        await this.projects.add(projectUri, true, true);

        // Open project file
        vscode.commands.executeCommand('vscode.openWith', projectUri, ProjectEditor.getViewType());
    }
}

export class OpenProjectCommand extends BaseCommand {

    static getID() {
        return 'edacation.openProject';
    }

    async execute() {
        // Ask for project workspace
        type WorkspaceItem = vscode.QuickPickItem & {uri?: vscode.Uri};
        const workspaceItems = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0 ? vscode.workspace.workspaceFolders
            .map((folder) => ({
                uri: folder.uri,
                label: `$(folder) ${folder.name}`,
                description: folder.uri.fsPath
            }) as WorkspaceItem) : [{
                label: `$(error) No workspace folders available`,
                description: 'Please add a folder to the workspace before using EDA projects.'
            }];

        const workspaceSelection = await vscode.window.showQuickPick(workspaceItems, {
            title: 'Choose EDA Project Workspace',
            canPickMany: false
        });
        if (!workspaceSelection || !workspaceSelection.uri) {
            return;
        }

        const projectWorkspace = workspaceSelection.uri;

        // Ask for project file
        const fileUris = await vscode.window.showOpenDialog({
            title: 'Open EDA Project',
            canSelectFolders: false,
            canSelectFiles: true,
            canSelectMany: false,
            defaultUri: projectWorkspace,
            filters: {
                /* eslint-disable-next-line @typescript-eslint/naming-convention */
                'EDA Projects (*.edaproject)': ['edaproject'],
            }
        });

        if (!fileUris || fileUris.length === 0) {
            return;
        }

        const projectUri = fileUris[0];

        // Check if folder is within workspace folder
        if (!projectUri.path.startsWith(projectWorkspace.path)) {
            console.log(projectWorkspace.path, projectUri.path);
            vscode.window.showErrorMessage('Selected project location must be within the selected workspace folder.');
            return;
        }

        // Add project
        await this.projects.add(projectUri, true, false);

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
