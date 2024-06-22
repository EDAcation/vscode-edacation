import * as vscode from 'vscode';

import {ManagedTool, getInstalledTools, getSuggestedTools} from '../tasks/managedtool';

import {BaseCommand} from './base';

const pickTools = async (tools: ManagedTool[], prompt = 'Select tools'): Promise<ManagedTool[]> => {
    const pickItems: vscode.QuickPickItem[] = [];
    for (const tool of tools) {
        if (!(await tool.isInstalled())) {
            // Not installed
            const latestVersion = await tool.getLatestVersion();
            pickItems.push({
                label: tool.getName(),
                description: 'Installable',
                detail: latestVersion ?? undefined
            });
        } else if (await tool.isUpdateAvailable()) {
            // Installed, but updateable
            const curVersion = await tool.getInstalledVersion();
            const latestVersion = await tool.getLatestVersion();
            pickItems.push({
                label: tool.getName(),
                description: 'Updateable',
                detail: `${curVersion} => ${latestVersion}`
            });
        } else {
            // Installed and up-to-date
            const curVersion = await tool.getInstalledVersion();
            pickItems.push({
                label: tool.getName(),
                description: 'Up-to-date',
                detail: curVersion ?? undefined
            });
        }
    }

    const picks = (await vscode.window.showQuickPick(pickItems, {title: prompt, canPickMany: true})) ?? [];
    const selectedToolNames = picks.map((pick) => pick.label);

    return tools.filter((tool) => selectedToolNames.includes(tool.getName()));
};

export class InstallToolCommand extends BaseCommand {
    static getID(): string {
        return 'edacation.installTool';
    }

    async execute(...toolNames: string[]): Promise<void> {
        let tools: ManagedTool[];
        if (toolNames.length) {
            tools = toolNames.map((toolName) => new ManagedTool(this.context, toolName));
        } else {
            tools = await pickTools(await getSuggestedTools(this.context), 'Select tools to (re)install');
        }

        await Promise.all(
            tools.map(async (tool) => {
                try {
                    await vscode.window.withProgress(
                        {title: `Installing ${tool.getName()}...`, location: vscode.ProgressLocation.Notification},
                        (_progress) => tool.install()
                    );
                } catch (err) {
                    await vscode.window.showErrorMessage(`Error while installing tool: ${err}`);
                    console.error(err);
                }

                void vscode.window.showInformationMessage(`Successfully installed ${tool.getName()}`);
            })
        );
    }
}

export class UninstallToolCommand extends BaseCommand {
    static getID(): string {
        return 'edacation.uninstallTool';
    }

    async execute(...toolNames: string[]): Promise<void> {
        let tools: ManagedTool[];
        if (toolNames.length) {
            tools = toolNames.map((toolName) => new ManagedTool(this.context, toolName));
        } else {
            const installedTools = await getInstalledTools(this.context);
            if (!installedTools.length) {
                await vscode.window.showErrorMessage('No tools are currently installed!');
                return;
            }

            tools = await pickTools(installedTools, 'Select tool(s) to uninstall');
        }

        await Promise.all(
            tools.map(async (tool) => {
                try {
                    await tool.uninstall();
                } catch (err) {
                    await vscode.window.showErrorMessage(`Error while uninstalling tool: ${err}`);
                    console.error(err);
                }

                void vscode.window.showInformationMessage(`Successfully uninstalled ${tool.getName()}`);
            })
        );
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
