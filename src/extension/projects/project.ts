import {
    Project as BaseProject,
    DEFAULT_CONFIGURATION,
    FILE_EXTENSIONS_HDL,
    type ProjectEvent as InternalProjectEvent,
    type ProjectConfiguration,
    type ProjectInputFileState,
    type ProjectOutputFileState,
    type ProjectState
} from 'edacation';
import path from 'path';
import * as vscode from 'vscode';
import {type URI, Utils} from 'vscode-uri';

import * as node from '../../common/node-modules.js';
import {type ProjectEvent as ExternalProjectEvent, type ProjectEventChannel} from '../../exchange.js';
import {decodeJSON, encodeJSON, getWorkspaceRelativePath} from '../util.js';

export class Project extends BaseProject {
    private channel?: [ProjectEventChannel, () => void];

    private uri: URI;
    private root: URI;

    constructor(
        uri: URI,
        name?: string,
        inputFiles: string[] | ProjectInputFileState[] = [],
        outputFiles: string[] | ProjectOutputFileState[] = [],
        configuration: ProjectConfiguration = DEFAULT_CONFIGURATION,
        channel?: ProjectEventChannel
    ) {
        super(
            name ? name : path.basename(uri.path, '.edaproject'),
            inputFiles,
            outputFiles,
            configuration,
            (_project, events) => this.onInternalEvent(events)
        );

        this.uri = uri;
        this.root = this.uri.with({
            path: path.dirname(this.uri.path)
        });

        if (channel !== undefined) {
            const unsubCallback = channel?.subscribe(this.onExternalEvent.bind(this), false);
            this.channel = [channel, unsubCallback];
        }

        void this.cleanIOFiles();
    }

    getUri() {
        return this.uri;
    }

    isUri(uri: URI) {
        return this.uri.toString() === uri.toString();
    }

    getRoot(): URI {
        return this.root;
    }

    getFileUri(path: string): URI {
        return Utils.joinPath(this.getRoot(), path);
    }

    getTargetDirectory(targetId: string): string {
        const target = this.getConfiguration().targets.find((target) => target.id === targetId);
        if (!target) return '.';

        return `./out/${this.getName()}/${target.id}/`;
    }

    async updateTargetDirectories() {
        const targets = this.getConfiguration()['targets'].map((target) => ({
            ...target,
            directory: this.getTargetDirectory(target.id)
        }));
        this.updateConfiguration({targets: targets});
    }

    async addInputFileUris(fileUris: URI[], notifyUser = true): Promise<void> {
        const files: {path: string; type: ProjectInputFileState['type']}[] = [];
        let copiedFileCount = 0;

        for (let fileUri of fileUris) {
            // eslint-disable-next-line prefer-const
            let [workspaceRelativePath, folderRelativePath] = getWorkspaceRelativePath(this.getRoot(), fileUri);
            if (!workspaceRelativePath) {
                const copiedFileUri = await this.tryCopyFileIntoWorkspace(fileUri, notifyUser);
                if (!copiedFileUri) continue;

                copiedFileCount++;

                fileUri = copiedFileUri;
                folderRelativePath = getWorkspaceRelativePath(this.getRoot(), fileUri)[1];
            }
            if (!folderRelativePath || this.hasInputFile(folderRelativePath)) continue;

            const parsedPath = path.parse(fileUri.path);
            const isTestbench =
                parsedPath.name.endsWith('_tb') && FILE_EXTENSIONS_HDL.includes(parsedPath.ext.substring(1));

            files.push({path: folderRelativePath, type: isTestbench ? 'testbench' : 'design'});
        }
        if (files.length === 0) return;

        if (copiedFileCount > 0 && notifyUser) {
            // do not await to prevent blocking
            void vscode.window.showInformationMessage(
                `Copied ${copiedFileCount} external file${copiedFileCount > 1 ? 's' : ''} into project folder.`
            );
        }

        super.addInputFiles(files);
    }

    private async tryCopyFileIntoWorkspace(uri: URI, notifyUser = true): Promise<URI | undefined> {
        if (!node.isAvailable()) {
            if (notifyUser) {
                await vscode.window.showErrorMessage(`File must be in the a subfolder of the EDA project root.`, {
                    detail: `File "${uri.path}" is not in folder "${this.getRoot().path}".`,
                    modal: true
                });
            }
            return undefined;
        }

        const targetDir = this.getFileUri('src');
        const targetUri = Utils.joinPath(targetDir, path.basename(uri.path));

        const newUri: URI | undefined = await new Promise((resolve: (newUri: URI) => void, reject) => {
            node.fs().mkdir(targetDir.fsPath, {recursive: true}, (err) => {
                if (err) {
                    reject(err);
                    if (notifyUser) void vscode.window.showErrorMessage(`Failed to copy file: ${err as Error}`);
                    return;
                }

                node.fs().copyFile(uri.fsPath, targetUri.fsPath, () => {
                    resolve(targetUri);
                });
            });
        });
        return newUri;
    }

    async addOutputFileUris(fileUris: URI[], targetId: string): Promise<void> {
        const filePaths = [];
        for (const fileUri of fileUris) {
            try {
                await vscode.workspace.fs.stat(fileUri);
            } catch {
                console.warn(`Not adding output file since it does not exist: ${fileUri.toString()}`);
                continue;
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [_workspaceRelativePath, folderRelativePath] = getWorkspaceRelativePath(this.getRoot(), fileUri);
            if (!folderRelativePath) continue;

            filePaths.push(folderRelativePath);
        }

        super.addOutputFiles(filePaths.map((path) => ({path, targetId})));
    }

    private async cleanIOFiles() {
        if (!vscode.workspace) return;

        const brokenInputFiles: string[] = [];
        for (const file of this.getInputFiles()) {
            try {
                await vscode.workspace.fs.stat(this.getFileUri(file.path));
            } catch {
                console.warn(`Input file does not exist, removing: ${file.path}`);
                brokenInputFiles.push(file.path);
            }
        }

        const brokenOutputFiles: string[] = [];
        for (const file of this.getOutputFiles()) {
            try {
                await vscode.workspace.fs.stat(this.getFileUri(file.path));
            } catch {
                console.warn(`Output file does not exist, removing: ${file.path}`);
                brokenOutputFiles.push(file.path);
            }
        }

        this.batchEvents(() => {
            if (brokenInputFiles.length) this.removeInputFiles(brokenInputFiles);
            if (brokenOutputFiles.length) this.removeOutputFiles(brokenOutputFiles);
        });
    }

    private ensureTestbenchPaths() {
        const testbenches = this.getInputFiles()
            .filter((file) => file.type == 'testbench')
            .map((file) => file.path);

        const changes: [string, string | undefined][] = [];

        for (const target of this.getConfiguration().targets) {
            const tbPath = target.iverilog?.options?.testbenchFile;

            if (tbPath && testbenches.includes(tbPath)) {
                // testbench is configured and correct
                continue;
            } else if (!tbPath && testbenches.length === 0) {
                // no path configured but also no testbenches present, so ok
                continue;
            }

            const newTb = testbenches.length === 0 ? undefined : testbenches[0];
            changes.push([target.id, newTb]);
        }

        if (changes.length > 0)
            this.batchEvents(() => {
                for (const [targetId, tbPath] of changes) this.setTestbenchPath(targetId, tbPath);
            });
    }

    private onExternalEvent(project: ExternalProjectEvent) {
        // Only handle events related to our project
        if (!project.isUri(this.getUri())) return;

        console.log(`[Project ${this.getUri().path}] Importing new project config`);

        try {
            this.importFromProject(project, false);
        } catch (err) {
            console.error(`Failed to import project configuration: ${err as Error}`);
            console.error(project);
        }
    }

    private onInternalEvent(events: InternalProjectEvent[]) {
        console.log(`[EDAcation] Received project events: ${events.toString()}`);

        console.log(this.channel);

        // do 'ensure' checks here
        this.ensureTestbenchPaths();

        if (this.channel) this.channel[0].submit(this);
    }

    async reloadFromDisk() {
        if (!vscode.workspace) return;

        const newProject = await Project.load(this.getUri());
        this.importFromProject(newProject, true);
    }

    disconnectChannel() {
        if (this.channel) {
            this.channel[1]();
            this.channel = undefined;
        }
    }

    async save() {
        if (!vscode.workspace) return;

        await Project.store(this);
    }

    static serialize(project: Project): ProjectState {
        return BaseProject.serialize(project);
    }

    static deserialize(data: ProjectState, uri: URI, channel?: ProjectEventChannel): Project {
        const name = data.name;
        const inputFiles = data.inputFiles ?? [];
        const outputFiles = data.outputFiles ?? [];
        const configuration = data.configuration ?? ({} as ProjectConfiguration);

        return new Project(uri, name, inputFiles, outputFiles, configuration, channel);
    }

    static async load(uri: URI, channel?: ProjectEventChannel): Promise<Project> {
        const data = decodeJSON(await vscode.workspace.fs.readFile(uri));
        const project = Project.deserialize(data as ProjectState, uri, channel);
        return project;
    }

    static async store(project: Project): Promise<URI> {
        const data = Project.serialize(project);
        await vscode.workspace.fs.writeFile(project.uri, encodeJSON(data, true));
        return project.uri;
    }
}
