import {
    Project as BaseProject,
    DEFAULT_CONFIGURATION,
    FILE_EXTENSIONS_HDL,
    type ProjectConfiguration,
    type ProjectInputFile,
    type ProjectInputFileState,
    type ProjectOutputFile,
    type ProjectOutputFileState,
    type ProjectState
} from 'edacation';
import path from 'path';
import * as vscode from 'vscode';

import * as node from '../../common/node-modules.js';
import {ProjectEventChannel, type ProjectEventType} from '../../exchange.js';
import {asWorkspaceRelativeFolderPath, decodeJSON, encodeJSON, getWorkspaceRelativePath} from '../util.js';

export class Project extends BaseProject {
    private readonly channel?: ProjectEventChannel;

    private uri: vscode.Uri;
    private root: vscode.Uri;
    private relativeRoot: string;

    constructor(
        uri: vscode.Uri,
        name?: string,
        inputFiles: string[] | ProjectInputFileState[] = [],
        outputFiles: string[] | ProjectOutputFileState[] = [],
        configuration: ProjectConfiguration = DEFAULT_CONFIGURATION,
        channel?: ProjectEventChannel
    ) {
        super(name ? name : path.basename(uri.path, '.edaproject'), inputFiles, outputFiles, configuration, {
            onInputFileChange: (files) => this.onInputFileChange(files),
            onOutputFileChange: (files) => this.onOutputFileChange(files),
            onConfigurationChange: (config) => this.onConfigurationChange(config)
        });

        this.uri = uri;
        this.root = this.uri.with({
            path: path.dirname(this.uri.path)
        });
        this.relativeRoot = asWorkspaceRelativeFolderPath(this.root);

        this.channel = channel;

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

    async updateTargetDirectories() {
        const targets = this.getConfiguration()['targets'].map((target) => ({
            ...target,
            directory: this.getTargetDirectory(target.id)
        }));
        this.updateConfiguration({targets: targets});
    }

    async setInputFileType(filePath: string, type: ProjectInputFile['type']) {
        const file = this.getInputFile(filePath);
        if (!file) {
            console.warn(`Tried to set file type of missing input file: ${filePath}`);
            return;
        }

        file.type = type;
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
        }
        if (files.length === 0) return;

        super.addInputFiles(files);
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
    }

    async setTestbenchPath(targetId: string, testbenchPath?: string) {
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
            await this.setTestbenchPath(target.id, newTb);
        }
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
        }

        super.addOutputFiles(filePaths.map((path) => ({path, targetId})));
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

        if (brokenInputFiles.length) this.removeInputFiles(brokenInputFiles);
        if (brokenOutputFiles.length) this.removeOutputFiles(brokenOutputFiles);
    }

    private async onInputFileChange(_files: ProjectInputFile[]) {
        console.log('[EDAcation] Input file change!');

        await this.cleanIOFiles();
        this.expireOutputFiles();
        this.ensureTestbenchPaths();

        await this.save();
        this.emitEvent('inputFile');
    }

    private async onOutputFileChange(_files: ProjectOutputFile[]) {
        console.log('[EDAcation] Output file change!');

        await this.cleanIOFiles();

        await this.save();
        this.emitEvent('outputFile');
    }

    private async onConfigurationChange(_configuration: ProjectConfiguration) {
        console.log('[EDAcation] Configuration change!');

        this.ensureTestbenchPaths();

        await this.save();
        this.emitEvent('config');
    }

    private emitEvent(event: ProjectEventType) {
        if (this.channel) this.channel.submit({event, project: this});
    }

    private async save() {
        await Project.store(this);
    }

    static serialize(project: Project): ProjectState {
        return BaseProject.serialize(project);
    }

    static deserialize(data: ProjectState, uri: vscode.Uri, channel?: ProjectEventChannel): Project {
        const name = data.name;
        const inputFiles = data.inputFiles ?? [];
        const outputFiles = data.outputFiles ?? [];
        const configuration = data.configuration ?? ({} as ProjectConfiguration);

        return new Project(uri, name, inputFiles, outputFiles, configuration, channel);
    }

    static async load(uri: vscode.Uri, channel?: ProjectEventChannel): Promise<Project> {
        const data = decodeJSON(await vscode.workspace.fs.readFile(uri));
        const project = Project.deserialize(data as ProjectState, uri, channel);
        return project;
    }

    static async store(project: Project): Promise<vscode.Uri> {
        const data = Project.serialize(project);
        await vscode.workspace.fs.writeFile(project.uri, encodeJSON(data, true));
        return project.uri;
    }
}
