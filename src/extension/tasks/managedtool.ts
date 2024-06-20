import * as vscode from 'vscode';

import * as node from '../../common/node-modules.js';

interface Platform {
    os: 'win32' | 'linux' | 'darwin';
    arch: 'x64' | 'arm64';
}

interface GithubAsset {
    name: string;
    state: 'uploaded' | 'open';
    size: number;
    updated_at: string;
    browser_download_url: string;
}

interface GithubRelease {
    assets: GithubAsset[];
}

interface ToolSettings {
    version: string;
    entrypoint: string;
}

type ToolsState = Record<string, ToolSettings>;

const GLOBAL_STATE_KEY = 'managedTools';
const TOOL_SUBDIR = 'managedTools';

export class ManagedTool {
    private static SUPPORTED_PLATFORMS: Platform[] = [
        {os: 'win32', arch: 'x64'},
        {os: 'linux', arch: 'x64'},
        {os: 'linux', arch: 'arm64'},
        {os: 'darwin', arch: 'x64'},
        {os: 'darwin', arch: 'arm64'}
    ];
    private static SOURCE_REPO = 'https://api.github.com/repos/YosysHQ/oss-cad-suite-build';

    private static platformCache: Platform | null = null;
    private static assetsCache: GithubAsset[] | null = null;

    constructor(
        private extensionContext: vscode.ExtensionContext,
        private tool: string
    ) {}

    getName(): string {
        return this.tool;
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

        const osmod = await node.os();
        if (!osmod) throw new Error('Native features cannot be used on VSCode for the web!');

        const os = osmod.platform();
        const arch = osmod.arch();

        const platform = ManagedTool.SUPPORTED_PLATFORMS.find((plat) => plat.os == os && plat.arch == arch);
        if (!platform) throw new Error(`Platform not supported: ${os}-${arch}`);

        return platform;
    }

    private async getAsset(): Promise<GithubAsset> {
        const platform = await ManagedTool.getPlatform();
        const assets = await ManagedTool.getLatestToolVersions();

        const asset = assets.find((asset) => asset.name === `${platform.os}-${platform.arch}-${this.tool}.tgz`);
        if (!asset) throw new Error(`Could not find tool: ${this.tool} for ${platform.os}-${platform.arch}`);
        return asset;
    }

    static async getLatestToolVersions(refresh = false): Promise<GithubAsset[]> {
        if (!refresh && ManagedTool.assetsCache) return ManagedTool.assetsCache;

        const platform = await ManagedTool.getPlatform();
        const url = `${ManagedTool.SOURCE_REPO}/releases/tags/bucket-${platform.os}-${platform.arch}`;
        const release = await fetch(url)
            .then((resp): Promise<GithubRelease> => resp.json())
            .catch((err) => {
                console.warn(`Release bucket fetch failed: ${err}`);
                return null;
            });
        if (!release) return [];

        return release.assets.filter((asset) => asset.state == 'uploaded');
    }

    async isUpdateAvailable(): Promise<boolean> {
        const curVersion = (await this.getSettings())?.version;
        // Something is broken?
        if (!curVersion) return false;

        const latestVersion = (await this.getAsset()).updated_at;

        // Update available if version strings are not equal
        return curVersion !== latestVersion;
    }

    async install() {
        // Find correct tool asset
        const asset = await this.getAsset();

        // Download .tgz (tar + gzip) file
        const toolBuf = await fetch(asset.browser_download_url)
            .then((resp) => resp.arrayBuffer())
            .catch((err) => {
                throw err;
            });

        // Create data buffer
        const buffer = Buffer.from(toolBuf);
        const readable = new (await node.stream()).PassThrough();
        readable.end(buffer);

        const toolName = this.tool;
        const targetDir = await this.getDir();

        // Extract!
        let entrypoint: string | null = null;
        const gunzipStream = readable.pipe((await node.zlib()).createGunzip());
        const unpackStream = gunzipStream.pipe(
            (await node.tar()).extract(targetDir.fsPath, {
                map(header) {
                    // Identify entrypoint
                    if (header.type == 'file' && header.name.split('/').at(-1) === toolName) {
                        console.log(`Found entrypoint: ${header.name}`);
                        entrypoint = header.name;
                    }

                    return header;
                }
            })
        );

        // Wait until extraction is done (or errors out)
        await new Promise((resolve, reject) => {
            unpackStream.on('finish', resolve);

            gunzipStream.on('error', reject);
            unpackStream.on('error', reject);
        });

        if (!entrypoint) {
            entrypoint = `bin/${this.tool}`;
            console.warn(`Assuming entrypoint: ${entrypoint}`);
        }

        // Update tool registry
        await this.setSettings({
            version: asset.updated_at,
            entrypoint: entrypoint
        });
    }

    async uninstall() {
        await this.delSettings();

        const toolDir = await this.getDir();
        await vscode.workspace.fs.delete(toolDir, {recursive: true, useTrash: false});
    }

    async getEntrypoint(): Promise<string | null> {
        const settings = await this.getSettings();
        if (!settings) return null;

        const entrypoint = vscode.Uri.joinPath(await this.getDir(), settings.entrypoint);
        try {
            await vscode.workspace.fs.stat(entrypoint);
        } catch {
            // File does not exist
            return null;
        }

        return entrypoint.fsPath;
    }
}

const getToolsState = async (extensionContext: vscode.ExtensionContext): Promise<ToolsState> => {
    const state = (await extensionContext.globalState.get(GLOBAL_STATE_KEY)) as ToolsState | undefined;
    return state ?? {};
};

const setToolsState = async (extensionContext: vscode.ExtensionContext, state: ToolsState): Promise<void> => {
    await extensionContext.globalState.update(GLOBAL_STATE_KEY, state);
};

export const getInstalledTools = async (extensionContext: vscode.ExtensionContext): Promise<ManagedTool[]> => {
    const state = await getToolsState(extensionContext);
    return Object.keys(state).map((id) => new ManagedTool(extensionContext, id));
};
