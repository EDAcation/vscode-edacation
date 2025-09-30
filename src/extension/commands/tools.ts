import * as vscode from 'vscode';

import * as node from '../../common/node-modules.js';
import {ManagedTool, type RemoteTool, ToolRepository} from '../tools';

import {BaseCommand} from './base';

abstract class ManagedToolCommand extends BaseCommand {
    protected get repository() {
        return ToolRepository.get(this.context);
    }

    // protected async pickLocalTools(tools: ManagedTool[], prompt?: string): Promise<ManagedTool[]> {
    //     const remoteTools = await Promise.all(tools.map((tool) => this.getRepository().getRemoteToolById(tool.id)));

    //     const picked = await this.pickRemoteTools(
    //         remoteTools.filter((tool) => tool !== null),
    //         prompt
    //     );
    // }

    protected async pickTools<T extends ManagedTool | RemoteTool>(tools: T[], prompt = 'Select tools'): Promise<T[]> {
        const pickItems: vscode.QuickPickItem[] = [];
        for (const tool of tools) {
            let localTool: ManagedTool | null;
            let remoteTool: RemoteTool | null;
            if (tool instanceof ManagedTool) {
                localTool = tool;
                remoteTool = await this.repository.getRemoteToolById(tool.id);
            } else {
                localTool = await this.repository.getLocalToolById(tool.tool);
                remoteTool = tool;
            }

            if (localTool === null && remoteTool !== null) {
                // Not installed, but available
                pickItems.push({
                    label: remoteTool.friendly_name,
                    description: remoteTool.version,
                    detail: 'Installable'
                });
            } else if (localTool !== null && (await localTool.isUpdateAvailable())) {
                // Installed, but updateable
                const latestVersion = await localTool.getLatestVersion();
                pickItems.push({
                    label: localTool.name,
                    description: `${localTool.version} => ${latestVersion}`,
                    detail: 'Updateable'
                });
            } else if (localTool !== null) {
                // Installed and up-to-date
                pickItems.push({
                    label: localTool.name,
                    description: localTool.version,
                    detail: 'Up-to-date'
                });
            }
        }

        const picks = (await vscode.window.showQuickPick(pickItems, {title: prompt, canPickMany: true})) ?? [];
        const selectedToolNames = picks.map((pick) => pick.label);

        return tools.filter((tool) => {
            const toolName = tool instanceof ManagedTool ? tool.name : tool.friendly_name;
            return selectedToolNames.includes(toolName);
        });
    }

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

    override async exec(...toolIds: string[]): Promise<void> {
        let tools: RemoteTool[] = [];
        if (toolIds.length) {
            for (const command of toolIds) {
                let tool = await this.repository.getRemoteToolById(command);
                if (!tool) {
                    // Maybe the user passed a command name instead of a tool ID
                    tool = await this.repository.getRemoteToolFromCommand(command);

                    if (!tool) {
                        void vscode.window.showErrorMessage(`Could not find managed tool providing "${command}"`);
                        return;
                    }
                }

                if (tools.map((tool) => tool.tool).includes(tool.tool)) {
                    // Command already provided by a tool marked for install
                    continue;
                }
                tools.push(tool);
            }
        } else {
            const remoteTools = await vscode.window.withProgress({location: vscode.ProgressLocation.Window}, (_prog) =>
                this.repository.getRemoteTools()
            );
            tools = await this.pickTools(remoteTools, 'Select tools to (re)install');
        }

        await Promise.all(tools.map((tool) => this.installTool(tool)));
    }

    private async installTool(tool: RemoteTool) {
        let managedTool: ManagedTool;

        try {
            let prevProgress = 0;
            managedTool = await vscode.window.withProgress(
                {title: `Installing ${tool.friendly_name}...`, location: vscode.ProgressLocation.Notification},
                (msgProgress) =>
                    this.repository.installTool(tool, (dlProgress) => {
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

        void vscode.window.showInformationMessage(`Successfully installed ${managedTool.name}`);
    }
}

export class UninstallToolCommand extends ManagedToolCommand {
    static getID(): string {
        return 'edacation.uninstallTool';
    }

    override async exec(...toolIds: string[]): Promise<void> {
        let tools: ManagedTool[] = [];
        if (toolIds.length) {
            for (const id of toolIds) {
                const tool = await this.repository.getLocalToolById(id);
                if (!tool) {
                    await vscode.window.showErrorMessage(`Unable to find tool to uninstall: ${id}`);
                    continue;
                }
                tools.push(tool);
            }
        } else {
            const installedTools = await this.repository.getLocalTools();
            if (!installedTools.length) {
                await vscode.window.showErrorMessage('No tools are currently installed!');
                return;
            }

            tools = await this.pickTools(installedTools, 'Select tool(s) to uninstall');
        }

        await Promise.all(
            tools.map(async (tool) => {
                if (!tool) {
                    await vscode.window.showErrorMessage(`Could not find tool`);
                    return;
                }

                try {
                    await tool.uninstall();
                } catch (err) {
                    console.error(err);
                    await vscode.window.showErrorMessage(`Error while uninstalling tool: ${err}`);
                    return;
                }

                await vscode.window.showInformationMessage(`Successfully uninstalled ${tool.name}`);
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
        const updateableTools = await this.repository.getUpdatableTools();

        await this.repository.markUpdateCheckDone();

        if (!updateableTools.length) return;

        let infoMessage: string;
        if (updateableTools.length === 1) {
            const toolsStr = updateableTools[0].name;
            infoMessage = `The following tool has an update available: ${toolsStr}. Do you want to install it?`;
        } else {
            const toolsStr = updateableTools.map((tool) => tool.name).join(', ');
            infoMessage = `The following tools have updates available: ${toolsStr}. Do you want to install them?`;
        }

        const resp = await vscode.window.showInformationMessage(infoMessage, 'Yes', 'No');
        if (resp === 'Yes') {
            await Promise.all(
                updateableTools.map((tool) => vscode.commands.executeCommand('edacation.installTool', tool.id))
            );
        }
    }
}
