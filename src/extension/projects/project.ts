import {
    Project as BaseProject,
    DEFAULT_CONFIGURATION,
    FILE_EXTENSIONS_HDL,
    type ProjectConfiguration,
    ProjectInputFile,
    ProjectInputFileState,
    type ProjectOutputFileState,
    type ProjectState
} from 'edacation';
import path from 'path';
import * as vscode from 'vscode';

import * as node from '../../common/node-modules.js';
import {asWorkspaceRelativeFolderPath, decodeJSON, encodeJSON, getWorkspaceRelativePath} from '../util.js';

import type {Projects} from './projects.js';

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
    private inputFileInfo: Map<string, vscode.FileSystemWatcher>;
    private outputFileInfo: Map<string, vscode.FileSystemWatcher>;

    constructor(
        projects: Projects,
        uri: vscode.Uri,
        name?: string,
        inputFiles: string[] | ProjectInputFileState[] = [],
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
        for (const file of this.getInputFiles()) {
            const uri = this.getFileUri(file.path);
            const watcher = getFileWatcher(uri, undefined, () => void this.removeInputFiles([file.path]));
            this.inputFileInfo.set(file.path, watcher);
        }

        this.outputFileInfo = new Map();
        for (const file of this.getOutputFiles()) {
            const watcher = getFileWatcher(
                this.getFileUri(file.path),
                undefined,
                () => void this.removeOutputFiles([file.path])
            );
            this.outputFileInfo.set(file.path, watcher);
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

    getFileUri(path: string): vscode.Uri {
        return vscode.Uri.joinPath(this.getRoot(), path);
    }

    getTargetDirectory(targetId: string): string {
        const target = this.getConfiguration().targets.find((target) => target.id === targetId);
        if (!target) return '.';

        return `./out/${this.getName()}/${target.id}/`;
    }

    private async cleanIOFiles() {
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
                console.warn(`Output file does not exist, removing: ${file}`);
                brokenOutputFiles.push(file.path);
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

    async setInputFileType(filePath: string, type: ProjectInputFile['type']) {
        const file = this.getInputFile(filePath);
        if (!file) {
            console.warn(`Tried to set file type of missing input file: ${filePath}`);
            return;
        }

        file.type = type;

        await this.ensureTestbenchPaths();
        this.projects.emitInputFileChange();

        await this.save();
    }

    async addInputFileUris(fileUris: vscode.Uri[]): Promise<void> {
        const files: {path: string; type: ProjectInputFileState['type']}[] = [];
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

            const parsedPath = path.parse(fileUri.path);
            const isTestbench =
                parsedPath.name.endsWith('_tb') && FILE_EXTENSIONS_HDL.includes(parsedPath.ext.substring(1));

            files.push({path: folderRelativePath, type: isTestbench ? 'testbench' : 'design'});
            this.inputFileInfo.set(
                folderRelativePath,
                getFileWatcher(
                    fileUri,
                    () => void this.markOutputFilesStale(true),
                    () => void this.removeInputFiles([folderRelativePath || ''])
                )
            );
        }
        if (files.length === 0) return;

        super.addInputFiles(files);
        await this.ensureTestbenchPaths();
        this.projects.emitInputFileChange();
        await this.markOutputFilesStale(false);
        await this.save();
    }

    async markOutputFilesStale(doSave = true) {
        this.expireOutputFiles();
        this.projects.emitOutputFileChange();

        if (doSave) await this.save();
    }

    async setTopLevelModule(targetId: string, module: string) {
        const target = this.getTarget(targetId);
        if (!target) throw new Error(`Target "${targetId}" does not exist!`);

        // Ensure the config tree exists
        // We don't care about setting missing defaults, as this is target-level configuration,
        // so any missing properties will fallback to project-level config.
        if (!target.yosys) target.yosys = {};
        if (!target.yosys.options) target.yosys.options = {};

        target.yosys.options.topLevelModule = module;

        await this.save();
    }

    async setTestbenchPath(targetId: string, testbenchPath?: string, doSave = true) {
        const testbenchFiles = this.getInputFiles()
            .filter((file) => file.type === 'testbench')
            .map((file) => file.path);
        if (testbenchPath && !testbenchFiles.includes(testbenchPath))
            throw new Error(`Testbench ${testbenchPath} is not marked as such!`);

        const target = this.getTarget(targetId);
        if (!target) throw new Error(`Target "${targetId}" does not exist!`);

        // Ensure the config tree exists
        // We don't care about setting missing defaults, as this is target-level configuration,
        // so any missing properties will fallback to project-level config.
        if (!target.iverilog) target.iverilog = {};
        if (!target.iverilog.options) target.iverilog.options = {};

        target.iverilog.options.testbenchFile = testbenchPath;

        if (doSave) await this.save();
    }

    async removeInputFiles(filePaths: string[]): Promise<void> {
        if (!filePaths.length) return;

        for (const filePath of filePaths) {
            this.inputFileInfo.get(filePath)?.dispose();
            this.inputFileInfo.delete(filePath);
        }

        super.removeInputFiles(filePaths);

        await this.ensureTestbenchPaths();

        this.projects.emitInputFileChange();

        await this.markOutputFilesStale(false);

        await this.save();
    }

    private async ensureTestbenchPaths() {
        const testbenches = this.getInputFiles()
            .filter((file) => file.type == 'testbench')
            .map((file) => file.path);

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
            await this.setTestbenchPath(target.id, newTb, false);
        }
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
            const targetDir = this.getFileUri('src');
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
            try {
                await vscode.workspace.fs.stat(fileUri);
            } catch {
                console.warn(`Not adding output file since it does not exist: ${fileUri}`);
                continue;
            }

            // eslint-disable-next-line prefer-const
            const [_workspaceRelativePath, folderRelativePath] = getWorkspaceRelativePath(this.getRoot(), fileUri);
            if (!folderRelativePath) continue;

            filePaths.push(folderRelativePath);

            if (!this.hasOutputFile(folderRelativePath)) {
                this.outputFileInfo.set(
                    folderRelativePath,
                    getFileWatcher(fileUri, undefined, () => void this.removeOutputFiles([folderRelativePath || '']))
                );
            }
        }

        super.addOutputFiles(filePaths.map((path) => ({path, targetId})));

        this.projects.emitOutputFileChange();

        await this.save();
    }

    async removeOutputFiles(filePaths: string[]): Promise<void> {
        for (const filePath of filePaths) {
            this.outputFileInfo.get(filePath)?.dispose();
            this.outputFileInfo.delete(filePath);
        }

        super.removeOutputFiles(filePaths);

        this.projects.emitOutputFileChange();

        await this.save();
    }

    private async save() {
        await Project.store(this);
        this.projects.emitProjectChange();
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
