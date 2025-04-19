import * as tar from 'tar-fs';
import * as vscode from 'vscode';

import * as node from '../../common/node-modules.js';

import {ManagedTool} from './managedtool';

interface Platform {
    os: 'windows' | 'linux' | 'darwin';
    arch: string;
}

interface RemoteToolRegistry {
    version: string;
    tools: RemoteTool[];
}

export interface RemoteTool {
    friendly_name: string;
    tool: string;
    provides: string[];
    arch: string;
    version: string;
    download_url: string;
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
}

const getDateString = (): string => {
    const now = new Date();

    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

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

    private static instance: ToolRepository;
    private static remoteToolsCache: RemoteToolRegistry | null = null;

    private extensionContext: vscode.ExtensionContext;
    private installedTools: Record<string, ManagedTool> | null;

    constructor(extensionContext: vscode.ExtensionContext) {
        this.extensionContext = extensionContext;
        this.installedTools = null;
    }

    public static get(extensionContext: vscode.ExtensionContext) {
        if (ToolRepository.instance) return ToolRepository.instance;
        ToolRepository.instance = new ToolRepository(extensionContext);
        return ToolRepository.instance;
    }

    public async getLocalTools(): Promise<ManagedTool[]> {
        return Object.values(await this.getInstalledTools());
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
        if (cache && cache.version == getDateString()) return cache.tools;

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

        ToolRepository.remoteToolsCache = toolRegistry;
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

        const localTool = new ManagedTool(this, {
            id: tool.tool,
            name: tool.friendly_name,
            version: tool.version,
            directory: targetDir.fsPath,
            providesCommands: tool.provides
        });
        (await this.getInstalledTools())[localTool.id] = localTool;

        await this.updateToolsState();

        return localTool;
    }

    public async uninstallTool(id: string): Promise<void> {
        const tool = await this.getLocalToolById(id);
        if (!tool) return; // not installed

        await vscode.workspace.fs.delete(tool.directory, {recursive: true, useTrash: false});
        delete (await this.getInstalledTools())[tool.id];

        await this.updateToolsState();
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

    private async getInstalledTools(): Promise<Record<string, ManagedTool>> {
        if (this.installedTools !== null) return this.installedTools;

        // Build from state
        const state = await this.getToolsState();
        this.installedTools = {};
        for (const tool of Object.values(state.installedTools)) {
            this.installedTools[tool.id] = new ManagedTool(this, tool);
        }

        return this.installedTools;
    }

    private async getToolsState(): Promise<ToolsState> {
        const state = (await this.extensionContext.globalState.get(ToolRepository.GLOBAL_STATE_KEY)) as ToolsState;
        return state ?? {};
    }

    private async updateToolsState(): Promise<void> {
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
