import type {TargetConfiguration} from 'edacation';
import * as vscode from 'vscode';

import type {ProjectFile, Projects} from '../projects/index.js';

import {BaseTreeDataProvider} from './base.js';

const getFileTreeItem = (uri: vscode.Uri): vscode.TreeItem => {
    return {
        resourceUri: uri,
        contextValue: 'file',
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        command: {
            title: 'Open file',
            command: 'vscode.open',
            arguments: [uri]
        }
    };
};

const getTargetTreeItem = (target: TargetConfiguration | null): vscode.TreeItem => {
    return {
        label: target?.name ?? 'Unknown targets',
        contextValue: 'target',
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded
    };
};

export class InputFilesProvider extends BaseTreeDataProvider<ProjectFile> {
    static getViewID() {
        return 'edacation-inputFiles';
    }

    constructor(context: vscode.ExtensionContext, projects: Projects) {
        super(context, projects);

        this.onDidChangeTreeData = projects.getInputFileEmitter().event;
    }

    getTreeItem(element: ProjectFile): vscode.TreeItem {
        const project = this.projects.getCurrent();
        if (!project) {
            throw new Error('Invalid state.');
        }

        return getFileTreeItem(element.uri);
    }

    getChildren(element?: ProjectFile): ProjectFile[] {
        const project = this.projects.getCurrent();
        if (!project) {
            return [];
        }

        // We do not want to nest input files
        if (element) return [];

        return project.getInputFileUris();
    }
}

// Project file or target id (for categories). Target ID may be empty string when unknown.
interface OutputFileTreeTarget {
    type: 'target';
    targetId: string | null;
}

interface OutputFileTreeFile {
    type: 'file';
    file: ProjectFile;
}

export type OutputFileTreeItem = OutputFileTreeTarget | OutputFileTreeFile;

export class OutputFilesProvider extends BaseTreeDataProvider<OutputFileTreeItem> {
    static getViewID() {
        return 'edacation-outputFiles';
    }

    private changeEmitter = new vscode.EventEmitter<OutputFileTreeItem | OutputFileTreeItem[] | undefined>();

    constructor(context: vscode.ExtensionContext, projects: Projects) {
        super(context, projects);

        // We "intercept" the change emitter and always emit undefined
        // because a small output file change could change the entire tree structure.
        // therefore we need to reload the entire tree on a change.
        this.onDidChangeTreeData = this.changeEmitter.event;
        projects.getOutputFileEmitter().event((_file) => this.changeEmitter.fire(undefined));
    }

    getTreeItem(element: OutputFileTreeItem): vscode.TreeItem {
        const project = this.projects.getCurrent();
        if (!project) {
            throw new Error('Invalid state.');
        }

        // Target category
        if (element.type === 'target') {
            const target = element.targetId ? project.getTarget(element.targetId) : null;
            return getTargetTreeItem(target);
        }

        return getFileTreeItem(element.file.uri);
    }

    getChildren(element?: OutputFileTreeItem): OutputFileTreeItem[] {
        const project = this.projects.getCurrent();
        if (!project) {
            return [];
        }

        // top-level: target IDs (categories)
        if (!element) {
            const targetIds = new Set<string | null>();
            for (const file of project.getOutputFiles()) {
                const targetId = file.targetId;
                if (targetId === null || project.getTarget(targetId) === null) {
                    targetIds.add(null);
                } else {
                    targetIds.add(targetId);
                }
            }

            const targets = Array.from(targetIds)
                .toSorted()
                .map((id: string | null): OutputFileTreeTarget => ({type: 'target', targetId: id}));
            if (targets.length && targets[0].targetId === null) {
                return targets.slice(1).concat([{type: 'target', targetId: null}]);
            }
            return targets;
        }

        // Target category
        if (element.type === 'target') {
            return project.getOutputFiles().flatMap((file) => {
                if (!element.targetId) {
                    // "unknown" category. If it has a targetId and it is valid, don't display it here!
                    if (file.targetId !== null && project.getTarget(file.targetId) !== null) return [];
                } else {
                    // Specific target category. Only display files with this target ID!
                    if (file.targetId !== element.targetId) return [];
                }

                const uri = project.getOutputFileUri(file.path);
                if (!uri) return [];

                return {
                    type: 'file',
                    file: {
                        path: file.path,
                        uri
                    }
                };
            });
        }

        // below target IDs: output files
        if (typeof element === 'string') {
            return project.getOutputFiles().flatMap((file) => {
                if (file.targetId !== element) return [];

                const uri = project.getOutputFileUri(file.path);
                if (!uri) return [];

                return {
                    type: 'file',
                    file: {
                        path: file.path,
                        uri
                    }
                };
            });
        }

        // below output files: nothing!
        return [];
    }
}
