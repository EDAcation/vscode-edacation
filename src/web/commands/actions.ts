import * as vscode from 'vscode';

import {ProjectEditor} from '../editors/index.js';
import type {Project} from '../projects/index.js';
import {NextpnrTaskProvider, RTLTaskProvider, YosysTaskProvider} from '../tasks/index.js';

import {CurrentProjectCommand} from './base.js';

export class OpenProjectConfigurationCommand extends CurrentProjectCommand {
    static getID() {
        return 'edacation.openProjectConfiguration';
    }

    async executeForCurrentProject(project: Project) {
        // Open project file
        vscode.commands.executeCommand('vscode.openWith', project.getUri(), ProjectEditor.getViewType());
    }
}

abstract class RunTaskCommand extends CurrentProjectCommand {
    abstract getTaskFilter(): vscode.TaskFilter;

    async executeForCurrentProject(project: Project) {
        const tasks = await vscode.tasks.fetchTasks(this.getTaskFilter());
        const task = tasks.find((task) => {
            if (
                task.scope === undefined ||
                task.scope === vscode.TaskScope.Global ||
                task.scope === vscode.TaskScope.Workspace
            ) {
                return false;
            }

            const uri = vscode.Uri.joinPath(task.scope.uri, task.definition.project);
            return uri.toString() === project.getUri().toString();
        });

        if (task) {
            vscode.tasks.executeTask(task);
        } else {
            vscode.window.showErrorMessage('No task could be found for the current EDA project.');
        }
    }
}

export class RunRTLCommand extends RunTaskCommand {
    static getID() {
        return 'edacation.runRTL';
    }

    getTaskFilter() {
        return {
            type: RTLTaskProvider.getType()
        };
    }
}

export class RunYosysCommand extends RunTaskCommand {
    static getID() {
        return 'edacation.runYosys';
    }

    getTaskFilter() {
        return {
            type: YosysTaskProvider.getType()
        };
    }
}

export class RunNextpnrCommand extends RunTaskCommand {
    static getID() {
        return 'edacation.runNextpnr';
    }

    getTaskFilter() {
        return {
            type: NextpnrTaskProvider.getType()
        };
    }
}
