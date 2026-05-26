import * as vscode from 'vscode';

import {ExtensionRecommendations} from '../recommends';

import {BaseCommand} from './base';

export class InstallRecommendedExtensionsCommand extends BaseCommand {
    static getID(): string {
        return 'edacation.installRecommendedExtensions';
    }

    async execute(includeIgnored: boolean = true): Promise<void> {
        const recommends = new ExtensionRecommendations(this.context);
        const extensions = recommends.getSuggestedExtensions(includeIgnored);

        if (extensions.length > 0) {
            const extensionNames = extensions.map((ext) => ext.name).join(', ');

            // Do not await so the extension can continue initializing
            vscode.window
                .showInformationMessage(
                    `EDAcation recommends installing the following extensions for additional functionality: ${extensionNames}`,
                    'Install now',
                    'Ignore'
                )
                .then(async (value) => {
                    if (value !== 'Install now') {
                        await recommends.ignoreExtensions(extensions);
                    } else {
                        await recommends.installExtensions(extensions);
                    }
                });
        }
    }
}

export class DiscoverProjectFilesCommand extends BaseCommand {
    static getID(): string {
        return 'edacation.discoverProjectFiles';
    }

    async execute(force = true): Promise<void> {
        const autoDiscoverProjects =
            vscode.workspace.getConfiguration('edacation').get<boolean>('autoDiscoverProjects') ?? true;
        if (!autoDiscoverProjects && !force) return;

        // Find up to 2 levels deep
        const results = (
            await Promise.all(
                ['*.edaproject', '*/*.edaproject'].map((pattern) =>
                    vscode.workspace.findFiles(pattern, '**/node_modules/**')
                )
            )
        ).flat();

        const newProjectUris = results.filter((uri) => !this.projects.has(uri));
        if (newProjectUris.length === 0) return;

        const choice = await vscode.window.showInformationMessage(
            `Found ${newProjectUris.length} new project file(s). Do you want to open them?`,
            'Open',
            'Ignore',
            'Disable auto-discover'
        );
        if (!choice || choice === 'Ignore') return;

        if (choice === 'Disable auto-discover') {
            await vscode.workspace
                .getConfiguration('edacation')
                .update('autoDiscoverProjects', false, vscode.ConfigurationTarget.Workspace);
            void vscode.window.showInformationMessage(
                'Project auto-discovery has been disabled for this workspace. You can re-enable it from settings.'
            );
            return;
        }

        // Add all projects except last one without selecting as current
        // to avoid a new-current-project event storm
        for (const uri of newProjectUris.slice(0, -1)) {
            await this.projects.add(uri, false, false);
        }

        const shouldSetCurrent = this.projects.getCurrent() === undefined; // Set current only if no current project
        await this.projects.add(newProjectUris[newProjectUris.length - 1], shouldSetCurrent, false);

        if (shouldSetCurrent) {
            await vscode.commands.executeCommand('edacation.openProjectConfiguration');
            void vscode.window.showInformationMessage(
                `Opened ${newProjectUris.length} new project(s). Active project is "${this.projects.getCurrent()?.getName()}".`
            );
        } else {
            void vscode.window.showInformationMessage(`Opened ${newProjectUris.length} new project(s).`);
        }
    }
}
