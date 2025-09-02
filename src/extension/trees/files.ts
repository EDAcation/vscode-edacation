import {type ProjectInputFile, type ProjectInputFileState, ProjectOutputFile, type ProjectTarget} from 'edacation';
import {basename, extname} from 'path';
import * as vscode from 'vscode';

import type {Projects} from '../projects/index.js';

import {BaseTreeDataProvider} from './base.js';

abstract class FilesProvider<T> extends BaseTreeDataProvider<T> {
    protected getFileTreeItem(
        file: ProjectInputFile | ProjectOutputFile,
        showPath = false,
        ctxSuffix: string = ''
    ): vscode.TreeItem {
        const project = this.projects.getCurrent();
        if (!project) {
            return {};
        }

        // Add 'stale' description if file is output file and stale
        const isOld = file instanceof ProjectOutputFile && file.stale;
        const uri = project.getFileUri(file.path);

        return {
            resourceUri: uri,

            label: basename(file.path),
            description: isOld ? '(stale)' : showPath,
            id: file.path,

            contextValue: `file${ctxSuffix ? '-' + ctxSuffix : ''}`,
            collapsibleState: vscode.TreeItemCollapsibleState.None,

            command: {
                title: 'Open file',
                command: 'vscode.open',
                arguments: [uri]
            }
        };
    }
}

interface InputFileTreeCategory {
    type: 'category';
    name: string;
    category: ProjectInputFileState['type'];
}

interface InputFileTreeFile {
    type: 'file';
    category: ProjectInputFile['type'];
    file: ProjectInputFile;
}

export type InputFileTreeItem = InputFileTreeCategory | InputFileTreeFile;

export class InputFilesProvider extends FilesProvider<InputFileTreeItem> {
    static getViewID() {
        return 'edacation-inputFiles';
    }

    constructor(context: vscode.ExtensionContext, projects: Projects) {
        super(context, projects);

        // We "intercept" the change emitter and always emit undefined
        // because a small input file change could change the entire tree structure.
        // therefore we need to reload the entire tree on a change.
        this.onDidChangeTreeData = this.changeEmitter.event;

        this.projectEventChannel.subscribe((_msg) => this.changeEmitter.fire(undefined));
        this.openProjectsChannel.subscribe((_msg) => this.changeEmitter.fire(undefined));
    }

    getTreeItem(element: InputFileTreeItem): vscode.TreeItem {
        if (element.type === 'category') {
            return this.getCategoryTreeItem(element.category, element.name);
        } else if (element.type === 'file') {
            return this.getFileTreeItem(element.file, true, element.category);
        }

        throw new Error(`Invalid tree element: ${element}`);
    }

    getChildren(element?: InputFileTreeItem): InputFileTreeItem[] {
        // Root: list categories
        if (!element) {
            const categories: InputFileTreeItem[] = [
                {type: 'category', name: 'Design', category: 'design'},
                {type: 'category', name: 'Testbench', category: 'testbench'}
            ];
            // Only show a category if it has any files
            return categories.filter((c) => this.getChildren(c).length !== 0);
        }

        const project = this.projects.getCurrent();
        if (!project) {
            return [];
        }

        // Category: list items
        if (element.type === 'category') {
            const files = project
                .getInputFiles()
                .filter((file) => file.type === element.category)
                .toSorted((a, b) => {
                    if (a.path < b.path) return -1;
                    if (a.path > b.path) return 1;
                    return 0;
                });
            return files.map((file) => ({type: 'file', category: element.category, file}));
        }

        // Anything else: no children
        return [];
    }

    private getCategoryTreeItem(type: ProjectInputFileState['type'], label: string) {
        return {
            label,
            id: type,

            contextValue: 'inputCategory',
            collapsibleState: vscode.TreeItemCollapsibleState.Expanded
        };
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
    file: ProjectOutputFile;
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

    constructor(context: vscode.ExtensionContext, projects: Projects) {
        super(context, projects);

        // We "intercept" the change emitter and always emit undefined
        // because a small output file change could change the entire tree structure.
        // therefore we need to reload the entire tree on a change.
        this.onDidChangeTreeData = this.changeEmitter.event;

        this.projectEventChannel.subscribe((_msg) => this.changeEmitter.fire(undefined));
        this.openProjectsChannel.subscribe((_msg) => this.changeEmitter.fire(undefined));
    }

    getTreeItem(element: OutputFileTreeItem): vscode.TreeItem {
        if (element.type === 'target') {
            // Target category
            const project = this.projects.getCurrent();
            if (!project) {
                throw new Error('Could not build output file tree: no current project.');
            }

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

                    const uri = project.getFileUri(file.path);
                    if (!uri) return [];

                    return [
                        {
                            type: 'file',
                            file
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
                    const uri = project.getFileUri(file.path);
                    if (!uri) return [];

                    return [
                        {
                            type: 'file',
                            file
                        }
                    ];
                })
                .toSorted();
        }

        // below output files: nothing!
        return [];
    }

    getTargetTreeItem(target: ProjectTarget | null): vscode.TreeItem {
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
