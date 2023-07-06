import {Project as BaseProject, DEFAULT_CONFIGURATION, type ProjectConfiguration} from 'edacation';
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

    async addInputFileUris(fileUris: vscode.Uri[]): Promise<void> {
        const filePaths = [];
        for (const fileUri of fileUris) {
            const [workspaceRelativePath, folderRelativePath] = getWorkspaceRelativePath(this.getRoot(), fileUri);
            if (!workspaceRelativePath) {
                vscode.window.showErrorMessage(`File must be in the a subfolder of the EDA project root.`, {
                    detail: `File "${fileUri.path}" is not in folder "${this.getRoot().path}".`,
                    modal: true
                });
                continue;
            }

            if (!this.hasInputFile(folderRelativePath)) {
                filePaths.push(folderRelativePath);
                this.inputFileUris.set(folderRelativePath, fileUri);
            }
        }

        await super.addInputFiles(filePaths);

        this.projects.emitInputFileChange();

        await this.save();
    }

    async removeInputFiles(filePaths: string[]): Promise<void> {
        for (const filePath of filePaths) {
            this.inputFileUris.delete(filePath);
        }

        await super.removeInputFiles(filePaths);

        this.projects.emitInputFileChange();

        await this.save();
    }

    async addOutputFileUris(fileUris: vscode.Uri[]): Promise<void> {
        const filePaths = [];
        for (const fileUri of fileUris) {
            const [workspaceRelativePath, folderRelativePath] = getWorkspaceRelativePath(this.getRoot(), fileUri);
            if (!workspaceRelativePath) {
                vscode.window.showErrorMessage(`File must be in the a subfolder of the EDA project root.`, {
                    detail: `File "${fileUri.path}" is not in folder "${this.getRoot().path}".`,
                    modal: true
                });
                continue;
            }

            if (!this.hasOutputFile(folderRelativePath)) {
                filePaths.push(folderRelativePath);
                this.outputFileUris.set(folderRelativePath, fileUri);
            }
        }

        await super.addOutputFiles(filePaths);

        this.projects.emitOutputFileChange();

        await this.save();
    }

    async removeOutputFiles(filePaths: string[]): Promise<void> {
        for (const filePath of filePaths) {
            this.outputFileUris.delete(filePath);
        }

        await super.removeOutputFiles(filePaths);

        this.projects.emitOutputFileChange();

        await this.save();
    }

    private async save() {
        await Project.store(this);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static serialize(project: Project): any {
        return BaseProject.serialize(project);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static deserialize(data: any, projects: Projects, uri: vscode.Uri): Project {
        const name: string = data.name;
        const inputFiles: string[] = data.inputFiles ?? [];
        const outputFiles: string[] = data.outputFiles ?? [];
        const configuration: ProjectConfiguration = data.configuration ?? {};

        return new Project(projects, uri, name, inputFiles, outputFiles, configuration);
    }

    static async load(projects: Projects, uri: vscode.Uri): Promise<Project> {
        const data = decodeJSON(await vscode.workspace.fs.readFile(uri));
        const project = Project.deserialize(data, projects, uri);
        return project;
    }

    static async store(project: Project): Promise<vscode.Uri> {
        const data = Project.serialize(project);
        await vscode.workspace.fs.writeFile(project.uri, encodeJSON(data, true));
        return project.uri;
    }
}
