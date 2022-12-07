import * as vscode from 'vscode';

import {ProjectEditor} from '../editors';
import {Project} from '../projects';
import {NextpnrTaskProvider, YosysTaskProvider} from '../tasks';
import {CurrentProjectCommand} from './base';

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
            if (task.scope === undefined || task.scope === vscode.TaskScope.Global || task.scope === vscode.TaskScope.Workspace) {
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
