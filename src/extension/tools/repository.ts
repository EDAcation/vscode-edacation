import * as tar from 'tar-fs';
import * as vscode from 'vscode';

import * as node from '../../common/node-modules.js';

import {ManagedTool} from './managedtool';

interface Platform {
    os: 'windows' | 'linux' | 'darwin';
    arch: string;
}

export interface RemoteTool {
    friendly_name: string;
    tool: string;
    provides: string[];
    arch: string;
    version: string;
    download_url: string;
}

interface RemoteToolRegistry {
    version: string;
    tools: RemoteTool[];
}

interface RemoteToolCache {
    savedAt: Date;
    registry: RemoteToolRegistry;
}

export interface ToolSettings {
    id: string;
    name: string;
    version: string;
    directory: string;
    providesCommands: string[];
}

interface ToolsState {
    installedTools: Record<string, ToolSettings>;
    lastUpdateCheck?: Date;
}

type UpdateCheckFrequency = 'daily' | 'weekly' | 'monthly' | 'never';

export const getPlatform = async (): Promise<Platform> => {
    // get OS ('win32' -> 'windows' for correct bucket name)
    const nodePlatform = node.os().platform();
    const os = nodePlatform === 'win32' ? 'windows' : nodePlatform;
    const arch = node.os().arch();

    if (!(os === 'linux' || os === 'windows' || os === 'darwin')) {
        throw new Error(`Unsupported OS: ${os}`);
    }

    return {os, arch};
};

const downloadTool = async (
    url: string,
    extractPath: string,
    onProgress?: (progress: number | null) => void
): Promise<void> => {
    const resp = await fetch(url);
    if (resp.status !== 200) throw new Error(`Unexpected HTTP status code: ${resp.status}`);
    if (!resp.body) throw new Error(`No data in response body!`);

    const contentLength = Number.parseInt(resp.headers.get('content-length') || '') || 0;
    const fetchReader = resp.body.getReader();

    // Create dl - gunzip - untar pipeline
    const buffer = new (node.stream().PassThrough)();
    const gunzipStream = buffer.pipe(node.zlib().createGunzip());
    const unpackStream = gunzipStream.pipe(
        tar.extract(extractPath, {
            map(header) {
                // Remove the first top-level directory
                header.name = header.name.replace(/^.+?\//, '');
                return header;
            }
        })
    );

    if (onProgress) onProgress(null);

    // Read download in chunks
    let downloadedSize = 0;
    while (true) {
        const chunk = await fetchReader.read();
        if (chunk.done) {
            buffer.end();
            break;
        }

        downloadedSize += chunk.value.byteLength;
        buffer.write(chunk.value);

        // Only update progress if we can give an indication
        if (onProgress && contentLength) {
            onProgress(downloadedSize / contentLength);
        }
    }

    // Wait until installation is done (or errors out)
    await new Promise((resolve, reject) => {
        unpackStream.on('finish', resolve);

        buffer.on('error', reject);
        gunzipStream.on('error', reject);
        unpackStream.on('error', reject);
    });

    // Finally, update progress handler, just to be sure
    if (onProgress) onProgress(1);
};

export class ToolRepository {
    private static readonly TOOLS_URL =
        'https://github.com/edacation/native-fpga-tools/releases/latest/download/tools.json';
    private static readonly GLOBAL_STATE_KEY = 'managedTools';
    private static readonly TOOL_SUBDIR = 'managedTools';
    private static readonly CACHE_EXPIRE_HRS = 12;

    private static instance: ToolRepository;
    private static remoteToolsCache: RemoteToolCache | null = null;

    private extensionContext: vscode.ExtensionContext;
    private state: ToolsState;

    constructor(extensionContext: vscode.ExtensionContext) {
        this.extensionContext = extensionContext;
        this.state = this.extensionContext.globalState.get<ToolsState>(ToolRepository.GLOBAL_STATE_KEY) ?? {
            installedTools: {}
        };
    }

    public static get(extensionContext: vscode.ExtensionContext) {
        if (ToolRepository.instance) return ToolRepository.instance;
        ToolRepository.instance = new ToolRepository(extensionContext);
        return ToolRepository.instance;
    }

    public async getLocalTools(): Promise<ManagedTool[]> {
        return Object.values(this.state.installedTools).map((tool) => new ManagedTool(this, tool));
    }

    public async getLocalToolById(id: string): Promise<ManagedTool | null> {
        const tools = await this.getLocalTools();
        return tools.find((tool) => tool.id === id) ?? null;
    }

    public async getLocalToolFromCommand(command: string): Promise<ManagedTool | null> {
        const tools = await this.getLocalTools();
        return tools.find((tool) => tool.providesCommands.includes(command)) ?? null;
    }

    public async getRemoteTools(): Promise<RemoteTool[]> {
        const cache = ToolRepository.remoteToolsCache;
        if (cache) {
            const now = new Date();
            const cacheHourDelta = (now.getTime() - cache.savedAt.getTime()) / (1000 * 60 * 60);
            if (cacheHourDelta < ToolRepository.CACHE_EXPIRE_HRS) {
                return cache.registry.tools;
            }
        }

        const platform = await getPlatform();
        const toolRegistry = await fetch(ToolRepository.TOOLS_URL)
            .then((resp): Promise<RemoteToolRegistry> => {
                if (!resp.ok) throw new Error(`GitHub returned status code: ${resp.status} (${resp.statusText})`);
                return resp.json();
            })
            .catch((err) => {
                console.warn(`Tool registry fetch failed: ${err}`);
                return null;
            });
        if (!toolRegistry) return [];

        // Other os-arch combinations are irrelevant
        toolRegistry.tools = toolRegistry.tools.filter((tool) => tool.arch === `${platform.os}-${platform.arch}`);

        ToolRepository.remoteToolsCache = {
            savedAt: new Date(),
            registry: toolRegistry
        };

        return toolRegistry.tools;
    }

    public async getRemoteToolById(id: string): Promise<RemoteTool | null> {
        const tools = await this.getRemoteTools();
        return tools.find((tool) => tool.tool === id) ?? null;
    }

    public async getRemoteToolFromCommand(command: string): Promise<RemoteTool | null> {
        const tools = await this.getRemoteTools();
        return tools.find((tool) => tool.provides.includes(command)) ?? null;
    }

    public async installTool(tool: RemoteTool, onProgress?: (progress: number | null) => void): Promise<ManagedTool> {
        const targetDir = await this.getToolDir(tool.tool);

        await downloadTool(tool.download_url, targetDir.fsPath, onProgress);

        const settings: ToolSettings = {
            id: tool.tool,
            name: tool.friendly_name,
            version: tool.version,
            directory: targetDir.fsPath,
            providesCommands: tool.provides
        };
        this.state.installedTools[settings.id] = settings;

        await this.saveState();
        await this.applyTerminalContributions();

        return new ManagedTool(this, settings);
    }

    public async uninstallTool(id: string): Promise<void> {
        const tool = await this.getLocalToolById(id);
        if (!tool) return; // not installed

        await vscode.workspace.fs.delete(tool.directory, {recursive: true, useTrash: false});
        delete this.state.installedTools[tool.id];

        await this.saveState();
        await this.applyTerminalContributions();
    }

    public shouldDoUpdateCheck(): boolean {
        const lastCheck = this.state.lastUpdateCheck ?? new Date(0);
        const now = new Date();
        const dayDelta = (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60 * 24);

        const frequency =
            vscode.workspace.getConfiguration('edacation').get<UpdateCheckFrequency>('managedToolUpdateFrequency') ??
            'weekly';

        switch (frequency) {
            case 'daily':
                return dayDelta >= 1;
            case 'weekly':
                return dayDelta >= 7;
            case 'monthly':
                return dayDelta >= 30;
            default: // never or unknown
                return false;
        }
    }

    public async getUpdatableTools(): Promise<ManagedTool[]> {
        const updatable: ManagedTool[] = [];

        const tools = await this.getLocalTools();
        for (const tool of tools) {
            if (await tool.isUpdateAvailable()) updatable.push(tool);
        }

        return updatable;
    }

    public async markUpdateCheckDone(): Promise<void> {
        this.state.lastUpdateCheck = new Date();

        await this.saveState();
    }

    public async applyTerminalContributions(): Promise<void> {
        // no-op when native tools are unavailable
        if (!node.isAvailable()) return;

        const localTools = await this.getLocalTools();

        const platform = await getPlatform();
        const pathSep = platform.os === 'windows' ? ';' : ':';
        const pathPrependStr =
            localTools
                .flatMap((tool) => tool.getBinPaths())
                .map((path) => path.fsPath)
                .join(pathSep) + pathSep;
        this.extensionContext.environmentVariableCollection.prepend('PATH', pathPrependStr);
    }

    // ---- helper methods ----
    private async getToolsDir(): Promise<vscode.Uri> {
        const dir = vscode.Uri.joinPath(this.extensionContext.globalStorageUri, ToolRepository.TOOL_SUBDIR);
        await vscode.workspace.fs.createDirectory(dir);
        return dir;
    }

    private async getToolDir(id: string): Promise<vscode.Uri> {
        return vscode.Uri.joinPath(await this.getToolsDir(), id);
    }

    private async saveState(): Promise<void> {
        const newState: ToolsState = {
            installedTools: {}
        };

        // Build state from installed tools
        for (const tool of await this.getLocalTools()) {
            newState.installedTools[tool.id] = tool.getSettings();
        }

        await this.extensionContext.globalState.update(ToolRepository.GLOBAL_STATE_KEY, newState);
    }
}
