import path from 'path';
import * as vscode from 'vscode';

import {decodeJSON, encodeJSON} from '../util';
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
    private name: string;
    private inputFiles: ProjectFile[];
    private outputFiles: ProjectFile[];
    private configuration: ProjectConfiguration;

    constructor(projects: Projects, uri: vscode.Uri, name?: string, inputFiles: string[] = [], outputFiles: string[] = [], configuration: ProjectConfiguration = DEFAULT_CONFIGURATION) {
        this.projects = projects;

        this.uri = uri;
        this.root = this.uri.with({
            path: path.dirname(this.uri.path)
        });
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
            if (!fileUri.path.startsWith(this.getRoot().path)) {
                console.log(this.getRoot().path, fileUri.path);
                await vscode.window.showErrorMessage(`File "${fileUri.path}" must be in the a subfolder of the EDA project root.`);
                continue;
            }

            const relativeFileUri = fileUri.path.replace(this.getRoot().path, '.');

            if (!this.hasInputFile(relativeFileUri)) {
                this.inputFiles.push({path: relativeFileUri, uri: fileUri});
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
            if (!fileUri.path.startsWith(this.getRoot().path)) {
                await vscode.window.showErrorMessage(`File "${fileUri.path}" must be in the a subfolder of the EDA project root.`);
                continue;
            }

            const relativeFileUri = fileUri.path.replace(this.getRoot().path, '.');

            if (!this.hasOutputFile(relativeFileUri)) {
                this.outputFiles.push({path: relativeFileUri, uri: fileUri});
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
