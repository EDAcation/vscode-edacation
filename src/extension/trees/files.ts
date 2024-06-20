import type {ProjectOutputFile, TargetConfiguration} from 'edacation';
import {basename, extname} from 'path-browserify';
import * as vscode from 'vscode';

import type {ProjectFile, Projects} from '../projects/index.js';

import {BaseTreeDataProvider} from './base.js';

abstract class FilesProvider<T> extends BaseTreeDataProvider<T> {
    protected getFileTreeItem(file: ProjectFile, showPath = false): vscode.TreeItem {
        // Add 'stale' description if file is output file and stale
        const outputFile = this.projects.getCurrent()?.getOutputFile(file.path) ?? null;
        const isOld = outputFile && outputFile.stale;

        return {
            resourceUri: file.uri,

            label: basename(file.path),
            description: isOld ? '(stale)' : showPath,
            id: file.path,

            contextValue: 'file',
            collapsibleState: vscode.TreeItemCollapsibleState.None,

            command: {
                title: 'Open file',
                command: 'vscode.open',
                arguments: [file.uri]
            }
        };
    }

    getTargetTreeItem(target: TargetConfiguration | null): vscode.TreeItem {
        return {
            label: target?.name ?? 'Unknown targets',
            id: target?.id,

            contextValue: 'target',
            collapsibleState: vscode.TreeItemCollapsibleState.Expanded
        };
    }

    getLogsTreeItem(): vscode.TreeItem {
        return {
            label: 'Logs',
            id: 'logs',

            contextValue: 'logs',
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
        };
    }
}

export class InputFilesProvider extends FilesProvider<ProjectFile> {
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

        return this.getFileTreeItem(element, true);
    }

    getChildren(element?: ProjectFile): ProjectFile[] {
        const project = this.projects.getCurrent();
        if (!project) {
            return [];
        }

        // We do not want to nest input files
        if (element) return [];

        return project.getInputFileUris().toSorted((a, b) => {
            if (a.path < b.path) return -1;
            if (a.path > b.path) return 1;
            return 0;
        });
    }
}

interface OutputFileTreeTarget {
    type: 'target';
    targetId: string | null; // null = "unknown target" category
}

interface OutputFileTreeLog {
    type: 'logs';
}

interface OutputFileTreeFile {
    type: 'file';
    file: ProjectFile;
}

export type OutputFileTreeItem = OutputFileTreeTarget | OutputFileTreeLog | OutputFileTreeFile;

type OutputFileType = 'known' | 'unknown' | 'logs';

const getOutputFileType = (file: ProjectOutputFile): OutputFileType => {
    if (extname(file.path) === '.log') {
        return 'logs';
    } else if (file.targetId === null || file.target === null) {
        return 'unknown';
    } else {
        return 'known';
    }
};

export class OutputFilesProvider extends FilesProvider<OutputFileTreeItem> {
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

        if (element.type === 'target') {
            // Target category
            const target = element.targetId ? project.getTarget(element.targetId) : null;
            return this.getTargetTreeItem(target);
        } else if (element.type === 'logs') {
            // Logs category
            return this.getLogsTreeItem();
        }

        // Nested file
        return this.getFileTreeItem(element.file);
    }

    getChildren(element?: OutputFileTreeItem): OutputFileTreeItem[] {
        const project = this.projects.getCurrent();
        if (!project) {
            return [];
        }

        // top-level: target IDs (categories)
        if (!element) {
            const targetIds = new Set<string>();
            let doIncludeUnknown = false;
            let doIncludeLogs = false;

            for (const file of project.getOutputFiles()) {
                const fileType = getOutputFileType(file);
                if (fileType === 'known' && file.targetId) targetIds.add(file.targetId);
                else if (fileType === 'unknown') doIncludeUnknown = true;
                else if (fileType === 'logs') doIncludeLogs = true;
            }

            const categories = Array.from(targetIds)
                .toSorted()
                .map((id: string): OutputFileTreeItem => ({type: 'target', targetId: id}));
            if (doIncludeUnknown) categories.push({type: 'target', targetId: null});
            if (doIncludeLogs) categories.push({type: 'logs'});

            return categories;
        }

        if (element.type === 'target') {
            // below targets: output files
            return project
                .getOutputFiles()
                .flatMap((file): OutputFileTreeFile[] => {
                    const fileType = getOutputFileType(file);
                    if (!element.targetId) {
                        // "unknown" category
                        if (fileType !== 'unknown') return [];
                    } else {
                        // Specific target category
                        if (fileType !== 'known' || file.targetId !== element.targetId) return [];
                    }

                    const uri = project.getOutputFileUri(file.path);
                    if (!uri) return [];

                    return [
                        {
                            type: 'file',
                            file: {
                                path: file.path,
                                uri
                            }
                        }
                    ];
                })
                .toSorted((a, b) => {
                    // First sort by file extension, then file name
                    const partsA = basename(a.file.path).split('.').toReversed();
                    const partsB = basename(b.file.path).split('.').toReversed();

                    if (partsA < partsB) return -1;
                    if (partsA > partsB) return 1;
                    return 0;
                });
        } else if (element.type === 'logs') {
            // below logs: logs!
            return project
                .getOutputFiles()
                .filter((file) => getOutputFileType(file) === 'logs')
                .flatMap((file): OutputFileTreeFile[] => {
                    const uri = project.getOutputFileUri(file.path);
                    if (!uri) return [];

                    return [
                        {
                            type: 'file',
                            file: {
                                path: file.path,
                                uri
                            }
                        }
                    ];
                })
                .toSorted();
        }

        // below output files: nothing!
        return [];
    }
}
