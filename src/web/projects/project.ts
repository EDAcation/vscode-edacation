import path from 'path';
import * as vscode from 'vscode';

import {asWorkspaceRelativeFolderPath, decodeJSON, encodeJSON, getWorkspaceRelativePath} from '../util';
import {DEFAULT_CONFIGURATION, ProjectConfiguration} from './configuration';
import {Projects} from './projects';

export interface ProjectFile {
    path: string;
    uri: vscode.Uri;
}

export class Project {

    private readonly projects: Projects;
    private uri: vscode.Uri;
    private root: vscode.Uri;
    private relativeRoot: string;
    private name: string;
    private inputFiles: ProjectFile[];
    private outputFiles: ProjectFile[];
    private configuration: ProjectConfiguration;

    constructor(
        projects: Projects,
        uri: vscode.Uri,
        name?: string,
        inputFiles: string[] = [],
        outputFiles: string[] = [],
        configuration: ProjectConfiguration = DEFAULT_CONFIGURATION
    ) {
        this.projects = projects;

        this.uri = uri;
        this.root = this.uri.with({
            path: path.dirname(this.uri.path)
        });
        this.relativeRoot = asWorkspaceRelativeFolderPath(this.root);
        this.name = name ? name : path.basename(this.uri.path, '.edaproject');
        this.inputFiles = inputFiles.map((file) => ({path: file, uri: vscode.Uri.joinPath(this.getRoot(), file)}));
        this.outputFiles = outputFiles.map((file) => ({path: file, uri: vscode.Uri.joinPath(this.getRoot(), file)}));
        this.configuration = configuration;
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

    // getRelativeToRoot(uri: vscode.Uri): [string, string] | [undefined, undefined] {
    //     const relativePath = vscode.workspace.asRelativePath(uri, true);

    //     if (!relativePath.startsWith(`${this.getRelativeRoot()}/`)) {
    //         return [undefined, undefined];
    //     }

    //     const projectRelativePath = relativePath.replace(new RegExp(`$${this.getRelativeRoot()}/`), '');

    //     return [relativePath, projectRelativePath];
    // }

    getName() {
        return this.name;
    }

    getInputFiles() {
        return this.inputFiles;
    }

    hasInputFile(filePath: string) {
        return this.inputFiles.some((file) => file.path === filePath);
    }

    async addInputFiles(fileUris: vscode.Uri[]) {
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
                this.inputFiles.push({path: folderRelativePath, uri: fileUri});
            }
        }

        this.inputFiles.sort((a, b) => {
            return a.path < b.path ? -1 : 1;
        });

        this.projects.emitInputFileChange();

        await this.save();
    }

    async removeInputFiles(fileUris: string[]) {
        this.inputFiles = this.inputFiles.filter((file) => !fileUris.includes(file.path));

        this.projects.emitInputFileChange();

        await this.save();
    }

    getOutputFiles() {
        return this.outputFiles;
    }

    hasOutputFile(filePath: string) {
        return this.outputFiles.some((file) => file.path === filePath);
    }

    async addOutputFiles(fileUris: vscode.Uri[]) {
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
                this.outputFiles.push({path: folderRelativePath, uri: fileUri});
            }
        }

        this.outputFiles.sort((a, b) => {
            return a.path < b.path ? -1 : 1;
        });

        this.projects.emitOutputFileChange();

        await this.save();
    }

    async removeOutputFiles(filePaths: string[]) {
        this.outputFiles = this.outputFiles.filter((file) => !filePaths.includes(file.path));

        this.projects.emitOutputFileChange();

        await this.save();
    }

    getConfiguration() {
        return this.configuration;
    }

    updateConfiguration(configuration: Partial<ProjectConfiguration>) {
        this.configuration = {
            ...this.configuration,
            ...configuration
        };
    }

    private async save() {
        await Project.store(this);
    }

    static serialize(project: Project): any {
        return {
            name: project.name,
            inputFiles: project.inputFiles.map((file) => file.path),
            outputFiles: project.outputFiles.map((file) => file.path)
        };
    }

    static deserialize(projects: Projects, uri: vscode.Uri, data: any): Project {
        const name: string = data.name;
        const inputFiles: string[] = data.inputFiles ?? [];
        const outputFiles: string[] = data.outputFiles ?? [];
        const configuration: ProjectConfiguration = data.configuration ?? {};

        return new Project(projects, uri, name, inputFiles, outputFiles, configuration);
    }

    static async load(projects: Projects, uri: vscode.Uri): Promise<Project> {
        const data = decodeJSON(await vscode.workspace.fs.readFile(uri));
        const project = Project.deserialize(projects, uri, data);
        return project;
    }

    static async store(project: Project): Promise<vscode.Uri> {
        const data = Project.serialize(project);
        await vscode.workspace.fs.writeFile(project.uri, encodeJSON(data, true));
        return project.uri;
    }
}
