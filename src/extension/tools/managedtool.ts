import * as vscode from 'vscode';

import * as node from '../../common/node-modules.js';

import {RemoteTool, ToolRepository, ToolSettings, getPlatform} from './repository.js';

export interface NativeToolExecutionOptions {
    entrypoint: string;
    path?: string;
}

export class ManagedTool {
    private repository: ToolRepository;
    private settings: ToolSettings;

    constructor(repository: ToolRepository, settings: ToolSettings) {
        this.repository = repository;
        this.settings = settings;
    }

    get id(): string {
        return this.settings.id;
    }

    get name(): string {
        return this.settings.name;
    }

    get version(): string {
        return this.settings.version;
    }

    get directory(): vscode.Uri {
        return vscode.Uri.file(this.settings.directory);
    }

    get providesCommands(): string[] {
        return this.settings.providesCommands;
    }

    public getBinPaths(): vscode.Uri[] {
        return ['bin', 'lib'].map((path) => vscode.Uri.joinPath(this.directory, path));
    }

    public async getLatestVersion(): Promise<string> {
        const remoteTool = await this.getRemoteTool();
        if (!remoteTool) return this.version; // unavailable remotely, so treat this as latest version
        return remoteTool.version;
    }

    public async isUpdateAvailable(): Promise<boolean> {
        return this.version !== (await this.getLatestVersion());
    }

    async isInstalled(): Promise<boolean> {
        return (await this.getExecutionOptions()) != null;
    }

    async install(onProgress?: (progress: number | null) => void) {
        const remoteTool = await this.repository.getRemoteToolById(this.id);
        if (!remoteTool) return;

        const newTool = await this.repository.installTool(remoteTool, onProgress);

        // copy new version etc.
        this.settings = newTool.getSettings();
    }

    async uninstall() {
        await this.repository.uninstallTool(this.id);
    }

    async getExecutionOptions(command: string = this.id): Promise<NativeToolExecutionOptions | null> {
        const platform = await getPlatform();

        const paths = ['bin/', 'lib/'].map((path) => vscode.Uri.joinPath(this.directory, path).fsPath);
        const pathSep = platform.os === 'windows' ? ';' : ':';
        const existingPath = node.process().env['PATH'] ?? '';
        const pathStr = existingPath + pathSep + paths.join(`${pathSep}`);

        const executableName = platform.os === 'windows' ? `${command}.exe` : command;

        const entrypoint = vscode.Uri.joinPath(this.directory, 'bin', executableName);
        try {
            await vscode.workspace.fs.stat(entrypoint);
        } catch {
            // Entrypoint does not exist
            return null;
        }

        return {
            entrypoint: entrypoint.fsPath,
            path: pathStr
        };
    }

    public getSettings() {
        return this.settings;
    }

    private async getRemoteTool(): Promise<RemoteTool | null> {
        return await this.repository.getRemoteToolById(this.id);
    }
}
