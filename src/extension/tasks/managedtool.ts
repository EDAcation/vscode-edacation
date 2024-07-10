import * as vscode from 'vscode';

import * as node from '../../common/node-modules.js';

interface Platform {
    os: 'windows' | 'linux' | 'darwin';
    arch: string;
}

interface AvailableTool {
    friendly_name: string;
    tool: string;
    arch: string;
    version: string;
    download_url: string;
}

interface AvailableToolRegistry {
    version: string;
    tools: AvailableTool[];
}

interface ToolSettings {
    version: string;
}

type ToolsState = Record<string, ToolSettings>;

export interface NativeToolExecutionOptions {
    entrypoint: string;
    path?: string;
}

const GLOBAL_STATE_KEY = 'managedTools';
const TOOL_SUBDIR = 'managedTools';

const getDateString = (): string => {
    const now = new Date();

    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
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

    const tar = await node.tar();

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

export class ManagedTool {
    private static TOOLS_URL = 'https://github.com/edacation/native-fpga-tools/releases/latest/download/tools.json';

    private static platformCache: Platform | null = null;
    private static availToolsCache: AvailableToolRegistry | null = null;

    constructor(
        private extensionContext: vscode.ExtensionContext,
        private tool: string
    ) {}

    getId(): string {
        return this.tool;
    }

    getName(): string {
        const toolsCache = ManagedTool.availToolsCache?.tools || [];
        const curTool = toolsCache.find((tool) => tool.tool === this.tool);

        // Cache is unavailable
        if (!curTool) return this.tool;

        return curTool.friendly_name;
    }

    private async getToolsDir(): Promise<vscode.Uri> {
        const dir = vscode.Uri.joinPath(this.extensionContext.globalStorageUri, TOOL_SUBDIR);
        await vscode.workspace.fs.createDirectory(dir);
        return dir;
    }

    private async getDir(): Promise<vscode.Uri> {
        return vscode.Uri.joinPath(await this.getToolsDir(), this.tool);
    }

    private async getToolsState(): Promise<ToolsState> {
        return getToolsState(this.extensionContext);
    }

    private async setToolsState(state: ToolsState) {
        return setToolsState(this.extensionContext, state);
    }

    private async getSettings(): Promise<ToolSettings | null> {
        const state = await this.getToolsState();
        return state[this.tool] ?? null;
    }

    private async setSettings(settings: ToolSettings) {
        const state = await this.getToolsState();
        state[this.tool] = settings;
        await this.setToolsState(state);
    }

    private async delSettings() {
        const state = await this.getToolsState();
        delete state[this.tool];
        await this.setToolsState(state);
    }

    private static async getPlatform(): Promise<Platform> {
        if (ManagedTool.platformCache) return ManagedTool.platformCache;

        // get OS ('win32' -> 'windows' for correct bucket name)
        const nodePlatform = node.os().platform();
        const os = nodePlatform === 'win32' ? 'windows' : nodePlatform;
        const arch = node.os().arch();

        if (!(os === 'linux' || os === 'windows' || os === 'darwin')) {
            throw new Error(`Unsupported OS: ${os}`);
        }

        return {os, arch};
    }

    private async getLatestTool(): Promise<AvailableTool> {
        const platform = await ManagedTool.getPlatform();
        const tools = await ManagedTool.getLatestTools();

        const tool = tools.find((tool) => tool.tool === this.tool);
        if (!tool) throw new Error(`Could not find tool: ${this.tool} for ${platform.os}-${platform.arch}`);
        return tool;
    }

    static async getLatestTools(): Promise<AvailableTool[]> {
        const cache = ManagedTool.availToolsCache;
        if (cache && cache.version == getDateString()) return cache.tools;

        const platform = await ManagedTool.getPlatform();
        const toolRegistry = await fetch(ManagedTool.TOOLS_URL)
            .then((resp): Promise<AvailableToolRegistry> => {
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

        ManagedTool.availToolsCache = toolRegistry;
        return toolRegistry.tools;
    }

    async getInstalledVersion(): Promise<string | null> {
        return (await this.getSettings())?.version ?? null;
    }

    async getLatestVersion(): Promise<string> {
        return (await this.getLatestTool()).version;
    }

    async isUpdateAvailable(): Promise<boolean> {
        const curVersion = await this.getInstalledVersion();
        if (!curVersion) return false; // Something is broken?

        const latestVersion = await this.getLatestVersion();

        // Update available if version strings are not equal
        return curVersion !== latestVersion;
    }

    async isInstalled(): Promise<boolean> {
        return (await this.getExecutionOptions()) != null;
    }

    async install(onProgress?: (progress: number | null) => void) {
        // Find correct tool asset and target dirs
        const tool = await this.getLatestTool();
        const targetDir = await this.getDir();

        await downloadTool(tool.download_url, targetDir.fsPath, onProgress);

        // Update tool registry
        await this.setSettings({
            version: tool.version
        });
    }

    async uninstall() {
        await this.delSettings();

        const toolDir = await this.getDir();
        await vscode.workspace.fs.delete(toolDir, {recursive: true, useTrash: false});
    }

    async getExecutionOptions(): Promise<NativeToolExecutionOptions | null> {
        const platform = await ManagedTool.getPlatform();
        const toolDir = await this.getDir();

        const paths = ['bin/', 'lib/'].map((path) => vscode.Uri.joinPath(toolDir, path).fsPath);
        const pathSep = platform.os === 'windows' ? ';' : ':';
        const existingPath = node.process().env['PATH'] ?? '';
        const pathStr = existingPath + pathSep + paths.join(`${pathSep}`);

        const executableName = platform.os === 'windows' ? `${this.tool}.exe` : this.tool;

        const entrypoint = vscode.Uri.joinPath(toolDir, 'bin', executableName);
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
}

const getToolsState = async (extensionContext: vscode.ExtensionContext): Promise<ToolsState> => {
    const state = (await extensionContext.globalState.get(GLOBAL_STATE_KEY)) as ToolsState;
    return state ?? {};
};

const setToolsState = async (extensionContext: vscode.ExtensionContext, state: ToolsState): Promise<void> => {
    await extensionContext.globalState.update(GLOBAL_STATE_KEY, state);
};

export const getInstalledTools = async (extensionContext: vscode.ExtensionContext): Promise<ManagedTool[]> => {
    const state = await getToolsState(extensionContext);
    return Object.keys(state).map((id) => new ManagedTool(extensionContext, id));
};

export const getSuggestedTools = async (extenstionContext: vscode.ExtensionContext): Promise<ManagedTool[]> => {
    const tools = await ManagedTool.getLatestTools();
    return tools.map((tool) => new ManagedTool(extenstionContext, tool.tool));
};
