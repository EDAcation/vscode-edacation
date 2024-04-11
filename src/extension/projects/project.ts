import {Project as BaseProject, DEFAULT_CONFIGURATION, type ProjectConfiguration, type ProjectState} from 'edacation';
import path from 'path';
import * as vscode from 'vscode';

import {asWorkspaceRelativeFolderPath, decodeJSON, encodeJSON, getWorkspaceRelativePath} from '../util.js';

import type {Projects} from './projects.js';

export interface ProjectFile {
    path: string;
    uri: vscode.Uri;
}

export class Project extends BaseProject {
    private readonly projects: Projects;
    private uri: vscode.Uri;
    private root: vscode.Uri;
    private relativeRoot: string;
    private inputFileUris: Map<string, vscode.Uri>;
    private outputFileUris: Map<string, vscode.Uri>;

    constructor(
        projects: Projects,
        uri: vscode.Uri,
        name?: string,
        inputFiles: string[] = [],
        outputFiles: string[] = [],
        configuration: ProjectConfiguration = DEFAULT_CONFIGURATION
    ) {
        super(name ? name : path.basename(uri.path, '.edaproject'), inputFiles, outputFiles, configuration);

        this.projects = projects;

        this.uri = uri;
        this.root = this.uri.with({
            path: path.dirname(this.uri.path)
        });
        this.relativeRoot = asWorkspaceRelativeFolderPath(this.root);

        this.inputFileUris = new Map<string, vscode.Uri>(
            inputFiles.map((file) => [file, vscode.Uri.joinPath(this.getRoot(), file)])
        );
        this.outputFileUris = new Map<string, vscode.Uri>(
            outputFiles.map((file) => [file, vscode.Uri.joinPath(this.getRoot(), file)])
        );
    }

    getUri() {
        return this.uri;
    }

    isUri(uri: vscode.Uri) {
        return this.uri.toString() === uri.toString();
    }

    getRoot() {
        return this.root;
    }

    getRelativeRoot() {
        return this.relativeRoot;
    }

    getInputFileUris() {
        return Array.from(this.inputFileUris.entries(), ([key, value]) => ({path: key, uri: value}));
    }

    getInputFileUri(inputFile: string) {
        return this.inputFileUris.get(inputFile);
    }

    getOutputFileUris() {
        return Array.from(this.outputFileUris.entries(), ([key, value]) => ({path: key, uri: value}));
    }

    getOutputFileUri(outputFile: string) {
        return this.outputFileUris.get(outputFile);
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
        await this.save();
    }

    async addInputFileUris(fileUris: vscode.Uri[]): Promise<void> {
        const filePaths = [];
        for (let fileUri of fileUris) {
            // eslint-disable-next-line prefer-const
            let [workspaceRelativePath, folderRelativePath] = getWorkspaceRelativePath(this.getRoot(), fileUri);
            if (!workspaceRelativePath) {
                const copiedFileUri = await this.tryCopyFileIntoWorkspace(fileUri);
                if (!copiedFileUri) continue;

                fileUri = copiedFileUri;
                folderRelativePath = vscode.workspace.asRelativePath(fileUri);
            }
            if (!folderRelativePath) continue;

            if (!this.hasInputFile(folderRelativePath)) {
                filePaths.push(folderRelativePath);
                this.inputFileUris.set(folderRelativePath, fileUri);
            }
        }

        super.addInputFiles(filePaths);

        this.projects.emitInputFileChange();

        await this.save();
    }

    async removeInputFiles(filePaths: string[]): Promise<void> {
        for (const filePath of filePaths) {
            this.inputFileUris.delete(filePath);
        }

        super.removeInputFiles(filePaths);

        this.projects.emitInputFileChange();

        await this.save();
    }

    private async tryCopyFileIntoWorkspace(uri: vscode.Uri): Promise<vscode.Uri | undefined> {
        const fs = await import('fs');

        if (!fs || !fs.copyFile) {
            await vscode.window.showErrorMessage(`File must be in the a subfolder of the EDA project root.`, {
                detail: `File "${uri.path}" is not in folder "${this.getRoot().path}".`,
                modal: true
            });
            return;
        }

        const answer = await vscode.window.showErrorMessage(
            `Copy file into EDA project root?`,
            {
                detail: `File "${uri.path}" is not in folder "${
                    this.getRoot().path
                }". Do you want to copy it into the project root?`,
                modal: true
            },
            'Yes',
            'No'
        );
        if (answer === 'Yes') {
            const target = vscode.Uri.joinPath(this.getRoot(), path.basename(uri.path));

            return new Promise((resolve, _reject) => {
                fs.copyFile(uri.fsPath, target.fsPath, () => {
                    resolve(target);
                });
            });
        }

        return;
    }

    async addOutputFileUris(fileUris: vscode.Uri[]): Promise<void> {
        const filePaths = [];
        for (let fileUri of fileUris) {
            // eslint-disable-next-line prefer-const
            let [workspaceRelativePath, folderRelativePath] = getWorkspaceRelativePath(this.getRoot(), fileUri);
            if (!workspaceRelativePath) {
                const copiedFileUri = await this.tryCopyFileIntoWorkspace(fileUri);
                if (!copiedFileUri) continue;

                fileUri = copiedFileUri;
                folderRelativePath = vscode.workspace.asRelativePath(fileUri);
            }
            if (!folderRelativePath) continue;

            if (!this.hasOutputFile(folderRelativePath)) {
                filePaths.push(folderRelativePath);
                this.outputFileUris.set(folderRelativePath, fileUri);
            }
        }

        super.addOutputFiles(filePaths);

        this.projects.emitOutputFileChange();

        await this.save();
    }

    async removeOutputFiles(filePaths: string[]): Promise<void> {
        for (const filePath of filePaths) {
            this.outputFileUris.delete(filePath);
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
