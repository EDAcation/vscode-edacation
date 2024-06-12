import * as vscode from 'vscode';

import {ProjectEditor} from '../editors/project.js';
import type {Project} from '../projects/index.js';
import {ensureFileAbsent, getWorkspaceRelativePath} from '../util.js';

import {BaseCommand} from './base.js';

export class NewProjectCommand extends BaseCommand {
    static getID() {
        return 'edacation.newProject';
    }

    async execute() {
        let projectLocation: vscode.Uri;

        // Ask for project name
        const name = await vscode.window.showInputBox({
            title: 'New EDA Project',
            prompt: 'Choose a name for the new project.'
        });
        if (!name) {
            return;
        }
        const projectName = name;

        // Ask for project workspace
        type WorkspaceItem = vscode.QuickPickItem & {uri?: vscode.Uri};
        const workspaceItems =
            vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
                ? vscode.workspace.workspaceFolders.map(
                      (folder) =>
                          ({
                              uri: folder.uri,
                              label: `$(folder) ${folder.name}`,
                              description: folder.uri.fsPath
                          } as WorkspaceItem)
                  )
                : [
                      {
                          label: `$(error) No workspace folders available`,
                          description: 'Please add a folder to the workspace before using EDA projects.'
                      }
                  ];

        const workspaceSelection = await vscode.window.showQuickPick(workspaceItems, {
            title: 'Choose EDA Project Workspace',
            canPickMany: false
        });
        if (!workspaceSelection || !workspaceSelection.uri) {
            return;
        }

        const projectWorkspace = workspaceSelection.uri;

        // Ask for project location
        const projectFolder = vscode.Uri.joinPath(projectWorkspace, projectName);
        type FolderItem = vscode.QuickPickItem & {key: 'folder' | 'root' | 'browse'};
        const folderItems = [
            {
                key: 'folder',
                label: `$(folder) New Folder: "${projectName}"`,
                description: projectFolder.fsPath
            },
            {
                key: 'root',
                label: '$(folder) Workspace Folder Root',
                description: projectWorkspace.fsPath
            },
            {
                key: 'browse',
                label: '$(folder-opened) Browse...',
                description: ''
            }
        ] as FolderItem[];

        const folderSelection = await vscode.window.showQuickPick(folderItems, {
            title: 'Choose EDA Project Location',
            canPickMany: false
        });
        if (!folderSelection) {
            return;
        }

        if (folderSelection.key === 'folder') {
            projectLocation = projectFolder;
        } else if (folderSelection.key === 'root') {
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
        const projectUri = vscode.Uri.joinPath(
            projectLocation,
            projectName.endsWith('.edaproject') ? projectName : `${projectName}.edaproject`
        );

        // Check if the project is within the workspace folder
        const [workspaceRelativePath] = getWorkspaceRelativePath(projectWorkspace, projectUri);
        if (!workspaceRelativePath) {
            await vscode.window.showErrorMessage(
                'Selected project location must be within the selected workspace folder.',
                {
                    detail: `File "${projectUri.path}" is not in folder "${projectWorkspace.path}".`,
                    modal: true
                }
            );
            return;
        }

        // Ensure the project file does not exist
        await ensureFileAbsent(projectUri);

        // Add project
        await this.projects.add(projectUri, true, true);

        // Open project file
        await vscode.commands.executeCommand('vscode.openWith', projectUri, ProjectEditor.getViewType());
    }
}

export class OpenProjectCommand extends BaseCommand {
    static getID() {
        return 'edacation.openProject';
    }

    async execute() {
        // Ask for project workspace
        type WorkspaceItem = vscode.QuickPickItem & {uri?: vscode.Uri};
        const workspaceItems =
            vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
                ? vscode.workspace.workspaceFolders.map(
                      (folder) =>
                          ({
                              uri: folder.uri,
                              label: `$(folder) ${folder.name}`,
                              description: folder.uri.fsPath
                          } as WorkspaceItem)
                  )
                : [
                      {
                          label: `$(error) No workspace folders available`,
                          description: 'Please add a folder to the workspace before using EDA projects.'
                      }
                  ];

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
                'EDA Projects (*.edaproject)': ['edaproject']
            }
        });

        if (!fileUris || fileUris.length === 0) {
            return;
        }

        const projectUri = fileUris[0];

        // Check if the project is within the workspace folder
        const [workspaceRelativePath] = getWorkspaceRelativePath(projectWorkspace, projectUri);
        if (!workspaceRelativePath) {
            await vscode.window.showErrorMessage(
                'Selected project location must be within the selected workspace folder.',
                {
                    detail: `File "${projectUri.path}" is not in folder "${projectWorkspace.path}".`,
                    modal: true
                }
            );
            return;
        }

        // Add project
        await this.projects.add(projectUri, true, false);

        // Open project file
        await vscode.commands.executeCommand('vscode.openWith', projectUri, ProjectEditor.getViewType());
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
