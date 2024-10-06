import {
    Project as BaseProject,
    DEFAULT_CONFIGURATION,
    type ProjectConfiguration,
    type ProjectOutputFileState,
    type ProjectState
} from 'edacation';
import path from 'path';
import * as vscode from 'vscode';

import * as node from '../../common/node-modules.js';
import {asWorkspaceRelativeFolderPath, decodeJSON, encodeJSON, getWorkspaceRelativePath} from '../util.js';

import type {Projects} from './projects.js';

export interface ProjectFile {
    path: string;
    uri: vscode.Uri;
}

interface ProjectFileData {
    uri: vscode.Uri;
    watcher: vscode.FileSystemWatcher;
}

type FileWatcherCallback = (uri: vscode.Uri) => void;

const getFileWatcher = (
    uri: vscode.Uri,
    onDidChange?: FileWatcherCallback,
    onDidDelete?: FileWatcherCallback
): vscode.FileSystemWatcher => {
    const watcher = vscode.workspace.createFileSystemWatcher(uri.fsPath, true, !onDidChange, !onDidDelete);
    watcher.onDidChange((uri) => onDidChange && onDidChange(uri));
    watcher.onDidDelete((uri) => onDidDelete && onDidDelete(uri));
    return watcher;
};

export class Project extends BaseProject {
    private readonly projects: Projects;
    private uri: vscode.Uri;
    private root: vscode.Uri;
    private relativeRoot: string;
    private inputFileInfo: Map<string, ProjectFileData>;
    private outputFileInfo: Map<string, ProjectFileData>;

    constructor(
        projects: Projects,
        uri: vscode.Uri,
        name?: string,
        inputFiles: string[] = [],
        outputFiles: string[] | ProjectOutputFileState[] = [],
        configuration: ProjectConfiguration = DEFAULT_CONFIGURATION
    ) {
        super(name ? name : path.basename(uri.path, '.edaproject'), inputFiles, outputFiles, configuration);

        this.projects = projects;

        this.uri = uri;
        this.root = this.uri.with({
            path: path.dirname(this.uri.path)
        });
        this.relativeRoot = asWorkspaceRelativeFolderPath(this.root);

        this.inputFileInfo = new Map();
        for (const file of inputFiles) {
            const uri = vscode.Uri.joinPath(this.getRoot(), file);
            const watcher = getFileWatcher(uri, undefined, () => void this.removeInputFiles([file]));
            this.inputFileInfo.set(file, {uri, watcher});
        }

        this.outputFileInfo = new Map();
        for (const file of this.getOutputFiles()) {
            const uri = vscode.Uri.joinPath(this.getRoot(), file.path);
            const watcher = getFileWatcher(uri, undefined, () => void this.removeOutputFiles([file.path]));
            this.outputFileInfo.set(file.path, {uri, watcher});
        }

        void this.cleanIOFiles();
    }

    getUri() {
        return this.uri;
    }

    isUri(uri: vscode.Uri) {
        return this.uri.toString() === uri.toString();
    }

    getRoot(): vscode.Uri {
        return this.root;
    }

    getRelativeRoot(): string {
        return this.relativeRoot;
    }

    getInputFileUris(): {path: string; uri: vscode.Uri}[] {
        return Array.from(this.inputFileInfo.entries(), ([key, value]) => ({path: key, uri: value.uri}));
    }

    getInputFileUri(inputFile: string): vscode.Uri | undefined {
        return this.inputFileInfo.get(inputFile)?.uri;
    }

    getOutputFileUris(): {path: string; uri: vscode.Uri}[] {
        return Array.from(this.outputFileInfo.entries(), ([key, value]) => ({path: key, uri: value.uri}));
    }

    getOutputFileUri(outputFile: string): vscode.Uri | undefined {
        return this.outputFileInfo.get(outputFile)?.uri;
    }

    getTargetDirectory(targetId: string): string {
        const target = this.getConfiguration().targets.find((target) => target.id === targetId);
        if (!target) return '.';

        return `./out/${this.getName()}/${target.id}/`;
    }

    private async cleanIOFiles() {
        const brokenInputFiles: string[] = [];
        for (const [file, data] of this.inputFileInfo) {
            try {
                await vscode.workspace.fs.stat(data.uri);
            } catch {
                console.warn(`Input file does not exist, removing: ${file}`);
                brokenInputFiles.push(file);
            }
        }

        const brokenOutputFiles: string[] = [];
        for (const [file, data] of this.outputFileInfo) {
            try {
                await vscode.workspace.fs.stat(data.uri);
            } catch {
                console.warn(`Output file does not exist, removing: ${file}`);
                brokenOutputFiles.push(file);
            }
        }

        if (brokenInputFiles.length) await this.removeInputFiles(brokenInputFiles);
        if (brokenOutputFiles.length) await this.removeOutputFiles(brokenOutputFiles);
    }

    async updateTargetDirectories() {
        const targets = this.getConfiguration()['targets'].map((target) => ({
            ...target,
            directory: this.getTargetDirectory(target.id)
        }));
        this.updateConfiguration({targets: targets});
        await this.save();
    }

    async addInputFileUris(fileUris: vscode.Uri[]): Promise<void> {
        const filePaths = [];
        let askForCopy = true;
        for (let fileUri of fileUris) {
            let [workspaceRelativePath, folderRelativePath] = getWorkspaceRelativePath(this.getRoot(), fileUri);
            if (!workspaceRelativePath) {
                const [yesToAll, copiedFileUri] = await this.tryCopyFileIntoWorkspace(fileUri, askForCopy);
                askForCopy = !yesToAll;
                if (!copiedFileUri) continue;

                fileUri = copiedFileUri;
                folderRelativePath = path.relative(this.getRoot().path, fileUri.path);
            }
            if (!folderRelativePath || this.hasInputFile(folderRelativePath)) continue;

            filePaths.push(folderRelativePath);
            this.inputFileInfo.set(folderRelativePath, {
                uri: fileUri,
                watcher: getFileWatcher(
                    fileUri,
                    () => void this.markOutputFilesStale(true),
                    () => void this.removeInputFiles([folderRelativePath || ''])
                )
            });
        }
        if (filePaths.length === 0) return;

        super.addInputFiles(filePaths);
        this.projects.emitInputFileChange();
        await this.markOutputFilesStale(false);
        await this.save();
    }

    async markOutputFilesStale(doSave = true) {
        this.expireOutputFiles();
        this.projects.emitOutputFileChange();

        if (doSave) await this.save();
    }

    async removeInputFiles(filePaths: string[]): Promise<void> {
        if (!filePaths.length) return;

        for (const filePath of filePaths) {
            this.inputFileInfo.get(filePath)?.watcher.dispose();
            this.inputFileInfo.delete(filePath);
        }

        super.removeInputFiles(filePaths);

        this.projects.emitInputFileChange();

        await this.markOutputFilesStale(false);

        await this.save();
    }

    private async tryCopyFileIntoWorkspace(
        uri: vscode.Uri,
        askForCopy = true
    ): Promise<[boolean, vscode.Uri | undefined]> {
        if (!node.isAvailable()) {
            await vscode.window.showErrorMessage(`File must be in the a subfolder of the EDA project root.`, {
                detail: `File "${uri.path}" is not in folder "${this.getRoot().path}".`,
                modal: true
            });
            return [false, undefined];
        }

        let answer: 'Only this file' | 'Yes to all' | 'No' = 'Yes to all';
        if (askForCopy)
            answer =
                (await vscode.window.showInformationMessage(
                    `Copy file into workspace?`,
                    {
                        detail: `The selected file "${uri.path}" is not in the workspace folder. 
                        Do you want to copy it into the project workspace?`,
                        modal: true
                    },
                    'Yes to all',
                    'Only this file'
                )) ?? 'No';

        if (answer === 'Only this file' || answer === 'Yes to all') {
            const targetDir = vscode.Uri.joinPath(this.getRoot(), 'src');
            const target = vscode.Uri.joinPath(targetDir, path.basename(uri.path));

            const newUri: vscode.Uri | undefined = await new Promise(
                (resolve: (newUri: vscode.Uri) => void, reject) => {
                    node.fs().mkdir(targetDir.fsPath, {recursive: true}, (err) => {
                        if (err) {
                            reject();
                            void vscode.window.showErrorMessage(`Failed to copy file: ${err}`);
                            return;
                        }

                        node.fs().copyFile(uri.fsPath, target.fsPath, () => {
                            resolve(target);
                        });
                    });
                }
            );
            return [answer === 'Yes to all', newUri];
        }

        return [false, undefined];
    }

    async addOutputFileUris(fileUris: vscode.Uri[], targetId: string): Promise<void> {
        const filePaths = [];
        for (let fileUri of fileUris) {
            // eslint-disable-next-line prefer-const
            const [_workspaceRelativePath, folderRelativePath] = getWorkspaceRelativePath(this.getRoot(), fileUri);
            if (!folderRelativePath) continue;

            filePaths.push(folderRelativePath);

            if (!this.hasOutputFile(folderRelativePath)) {
                this.outputFileInfo.set(folderRelativePath, {
                    uri: fileUri,
                    watcher: getFileWatcher(
                        fileUri,
                        undefined,
                        () => void this.removeOutputFiles([folderRelativePath || ''])
                    )
                });
            }
        }

        super.addOutputFiles(filePaths.map((path) => ({path, targetId})));

        this.projects.emitOutputFileChange();

        await this.save();
    }

    async removeOutputFiles(filePaths: string[]): Promise<void> {
        for (const filePath of filePaths) {
            this.outputFileInfo.get(filePath)?.watcher.dispose();
            this.outputFileInfo.delete(filePath);
        }

        super.removeOutputFiles(filePaths);

        this.projects.emitOutputFileChange();

        await this.save();
    }

    private async save() {
        await Project.store(this);
    }

    static serialize(project: Project): ProjectState {
        return BaseProject.serialize(project);
    }

    static deserialize(data: ProjectState, projects: Projects, uri: vscode.Uri): Project {
        const name = data.name;
        const inputFiles = data.inputFiles ?? [];
        const outputFiles = data.outputFiles ?? [];
        const configuration = data.configuration ?? ({} as ProjectConfiguration);

        return new Project(projects, uri, name, inputFiles, outputFiles, configuration);
    }

    static async load(projects: Projects, uri: vscode.Uri): Promise<Project> {
        const data = decodeJSON(await vscode.workspace.fs.readFile(uri));
        const project = Project.deserialize(data as ProjectState, projects, uri);
        return project;
    }

    static async store(project: Project): Promise<vscode.Uri> {
        const data = Project.serialize(project);
        await vscode.workspace.fs.writeFile(project.uri, encodeJSON(data, true));
        return project.uri;
    }
}
