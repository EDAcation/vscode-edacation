import type {TargetConfiguration} from 'edacation';
import * as vscode from 'vscode';

import {ProjectEditor} from '../editors/index.js';
import type {Project} from '../projects/index.js';
import {IVerilogTaskProvider, NextpnrTaskProvider, RTLTaskProvider, YosysTaskProvider} from '../tasks/index.js';

import {CurrentProjectCommand} from './base.js';

export class OpenProjectConfigurationCommand extends CurrentProjectCommand {
    static getID() {
        return 'edacation.openProjectConfiguration';
    }

    async executeForCurrentProject(project: Project) {
        // Open project file
        await vscode.commands.executeCommand('vscode.openWith', project.getUri(), ProjectEditor.getViewType());
    }
}

abstract class RunTaskCommand extends CurrentProjectCommand {
    abstract getTaskFilter(): vscode.TaskFilter;

    async executeForCurrentProject(project: Project, targetId?: string) {
        const targets = project.getConfiguration().targets;
        if (targets.length === 0) {
            await vscode.window.showWarningMessage('The current project has no targets defined.');
            return;
        }

        let target: TargetConfiguration | undefined;
        if (targetId) {
            target = targets.find((target) => target.id === targetId);
            if (!target) {
                await vscode.window.showWarningMessage(`No target was found with ID "${targetId}".`);
                return;
            }
        } else {
            target = targets[0];
        }

        const tasks = await vscode.tasks.fetchTasks(this.getTaskFilter());
        const task = tasks.find((task) => {
            if (
                task.scope === undefined ||
                task.scope === vscode.TaskScope.Global ||
                task.scope === vscode.TaskScope.Workspace
            ) {
                return false;
            }

            const uri = vscode.Uri.joinPath(task.scope.uri, task.definition.project as string);
            const targetId = task.definition.targetId as string;
            return uri.toString() === project.getUri().toString() && targetId === target.id;
        });

        if (task) {
            await vscode.tasks.executeTask(task);
        } else {
            await vscode.window.showErrorMessage('No task could be found for the current EDA project.');
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

export class RunIVerilogCommand extends RunTaskCommand {
    static getID() {
        return 'edacation.runIverilog';
    }

    getTaskFilter() {
        return {
            type: IVerilogTaskProvider.getType()
        };
    }
}
