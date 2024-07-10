import * as vscode from 'vscode';

import * as node from '../../common/node-modules.js';
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
                description: latestVersion ?? undefined,
                detail: 'Installable'
            });
        } else if (await tool.isUpdateAvailable()) {
            // Installed, but updateable
            const curVersion = await tool.getInstalledVersion();
            const latestVersion = await tool.getLatestVersion();
            pickItems.push({
                label: tool.getName(),
                description: `${curVersion} => ${latestVersion}`,
                detail: 'Updateable'
            });
        } else {
            // Installed and up-to-date
            const curVersion = await tool.getInstalledVersion();
            pickItems.push({
                label: tool.getName(),
                description: curVersion ?? undefined,
                detail: 'Up-to-date'
            });
        }
    }

    const picks = (await vscode.window.showQuickPick(pickItems, {title: prompt, canPickMany: true})) ?? [];
    const selectedToolNames = picks.map((pick) => pick.label);

    return tools.filter((tool) => selectedToolNames.includes(tool.getName()));
};

abstract class ManagedToolCommand extends BaseCommand {
    abstract exec(...args: unknown[]): Promise<void>;

    async execute(...args: unknown[]) {
        if (!node.isAvailable()) {
            throw new Error('Native tools cannot be used in a web environment.');
        }

        return await this.exec(...args);
    }
}

export class InstallToolCommand extends ManagedToolCommand {
    static getID(): string {
        return 'edacation.installTool';
    }

    override async exec(...toolNames: string[]): Promise<void> {
        let tools: ManagedTool[];
        if (toolNames.length) {
            tools = toolNames.map((toolName) => new ManagedTool(this.context, toolName));
        } else {
            const suggestedTools = await vscode.window.withProgress(
                {location: vscode.ProgressLocation.Window},
                (_prog) => getSuggestedTools(this.context)
            );
            tools = await pickTools(suggestedTools, 'Select tools to (re)install');
        }

        await Promise.all(
            tools.map(async (tool) => {
                try {
                    let prevProgress = 0;
                    await vscode.window.withProgress(
                        {title: `Installing ${tool.getName()}...`, location: vscode.ProgressLocation.Notification},
                        (msgProgress) =>
                            tool.install((dlProgress) => {
                                if (!dlProgress) return msgProgress.report({increment: undefined});

                                // Convert from 0 - 1 to 0 - 100
                                const curProgress = dlProgress * 100;
                                msgProgress.report({increment: curProgress - prevProgress});
                                prevProgress = curProgress;
                            })
                    );
                } catch (err) {
                    void vscode.window.showErrorMessage(`Error while installing tool: ${err}`);
                    console.error(err);
                    return;
                }

                void vscode.window.showInformationMessage(`Successfully installed ${tool.getName()}`);
            })
        );
    }
}

export class UninstallToolCommand extends ManagedToolCommand {
    static getID(): string {
        return 'edacation.uninstallTool';
    }

    override async exec(...toolNames: string[]): Promise<void> {
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
                    void vscode.window.showErrorMessage(`Error while uninstalling tool: ${err}`);
                    console.error(err);
                    return;
                }

                void vscode.window.showInformationMessage(`Successfully uninstalled ${tool.getName()}`);
            })
        );
    }
}

export class CheckToolUpdateCommand extends ManagedToolCommand {
    static getID(): string {
        return 'edacation.checkToolUpdates';
    }

    override async exec(..._args: unknown[]): Promise<void> {
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
                updateableTools.map((tool) => vscode.commands.executeCommand('edacation.installTool', tool.getId()))
            );
        }
    }
}
