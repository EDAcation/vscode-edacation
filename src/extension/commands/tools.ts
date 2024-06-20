import * as vscode from 'vscode';

import {ManagedTool, getInstalledTools} from '../tasks/managedtool';

import {BaseCommand} from './base';

export class InstallToolCommand extends BaseCommand {
    static getID(): string {
        return 'edacation.installTool';
    }

    async execute(toolName: string): Promise<void> {
        const tool = new ManagedTool(this.context, toolName);

        try {
            await vscode.window.withProgress(
                {title: `Installing ${tool.getName()}...`, location: vscode.ProgressLocation.Notification},
                (_progress) => tool.install()
            );
        } catch (err) {
            await vscode.window.showErrorMessage(`Error while installing tool: ${err}`);
            console.error(err);
        }
    }
}

export class CheckToolUpdateCommand extends BaseCommand {
    static getID(): string {
        return 'edacation.checkToolUpdates';
    }

    async execute(..._args: unknown[]): Promise<void> {
        await vscode.window.withProgress(
            {title: '[EDAcation] Checking for tool updates...', location: vscode.ProgressLocation.Window},
            (_progress) => ManagedTool.getLatestToolVersions(true)
        );

        // Filter out updateable tools
        const updateableTools: ManagedTool[] = [];
        for (const tool of await getInstalledTools(this.context)) {
            if (await tool.isUpdateAvailable()) updateableTools.push(tool);
        }

        if (!updateableTools.length) return;

        let infoMessage: string;
        if (updateableTools.length === 1) {
            const toolsStr = updateableTools[0].getName();
            infoMessage = `The following tool has an update available: ${toolsStr}. Do you want to install it?`;
        } else {
            const toolsStr = updateableTools.map((tool) => tool.getName()).join(', ');
            infoMessage = `The following tools have updates available: ${toolsStr}. Do you want to install them?`;
        }

        const resp = await vscode.window.showInformationMessage(infoMessage, 'Yes', 'No');
        if (resp === 'Yes') {
            await Promise.all(
                updateableTools.map((tool) => vscode.commands.executeCommand('edacation.installTool', tool.getName()))
            );
        }
    }
}
