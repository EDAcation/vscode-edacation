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
