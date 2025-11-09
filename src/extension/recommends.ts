import * as vscode from 'vscode';

import * as node from '../common/node-modules';

interface Extension {
    id: string;
    name: string;
    nativeOnly: boolean;
}

export class ExtensionRecommendations {
    private static readonly extensions: Extension[] = [
        {
            id: 'edacation.pincfg-editor',
            name: 'Pin Constraint Editor',
            nativeOnly: false
        },
        {
            id: 'sndst00m.vscode-native-svg-preview',
            name: 'SVG Preview',
            nativeOnly: true
        },
        {
            id: 'surfer-project.surfer',
            name: 'Surfer',
            nativeOnly: true
        }
    ];
    private static readonly storageKey = 'edacation.recommended-extensions';

    private readonly ctx: vscode.ExtensionContext;

    constructor(ctx: vscode.ExtensionContext) {
        this.ctx = ctx;
    }

    getIgnoredExtensionIds(): string[] {
        return this.ctx.globalState.get<string[]>(ExtensionRecommendations.storageKey, []);
    }

    getSuggestedExtensions(includeIgnored: boolean = false): Extension[] {
        const ignored = this.getIgnoredExtensionIds();

        const suggestions: Extension[] = [];
        for (const ext of ExtensionRecommendations.extensions) {
            if (ext.nativeOnly && !node.isAvailable()) continue;

            const isIgnored = ignored.includes(ext.id);
            if (!includeIgnored && isIgnored) continue;

            const isInstalled = vscode.extensions.getExtension(ext.id) !== undefined;
            if (isInstalled) continue;

            suggestions.push(ext);
        }
        return suggestions;
    }

    async installExtensions(extensions: Extension[]) {
        await Promise.allSettled(
            extensions.map((ext) => vscode.commands.executeCommand('workbench.extensions.installExtension', ext.id))
        );
    }

    async ignoreExtensions(extensions: Extension[]) {
        const currentIgnored = new Set(this.getIgnoredExtensionIds());
        for (const ext of extensions) {
            currentIgnored.add(ext.id);
        }

        await this.ctx.globalState.update(ExtensionRecommendations.storageKey, Array.from(currentIgnored));
    }
}
