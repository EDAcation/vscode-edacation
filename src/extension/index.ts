import * as vscode from 'vscode';

import * as node from '../common/node-modules.js';

import * as commands from './commands/index.js';
import * as editors from './editors/index.js';
import {Projects} from './projects/index.js';
import * as tasks from './tasks/index.js';
import {ToolRepository} from './tools/repository.js';
import type {BaseTreeDataProvider} from './trees/base.js';
import * as trees from './trees/index.js';
import * as webviews from './webviews/index.js';

let projects: Projects | undefined;

export const activate = async (context: vscode.ExtensionContext) => {
    projects = new Projects(context);

    // Register commands
    for (const commandType of Object.values(commands)) {
        const command = new commandType(context, projects);
        context.subscriptions.push(vscode.commands.registerCommand(commandType.getID(), command.execute.bind(command)));
    }

    // Register custom editors
    for (const editorType of Object.values(editors)) {
        const editor = new editorType(context, projects);
        context.subscriptions.push(
            vscode.window.registerCustomEditorProvider(editorType.getViewType(), editor, {
                webviewOptions: editorType.getWebviewOptions()
            })
        );
    }

    // Register task providers
    for (const taskType of Object.values(tasks)) {
        const task = new taskType(context, projects);
        context.subscriptions.push(vscode.tasks.registerTaskProvider(taskType.getType(), task));
    }

    // Register tree data providers
    for (const treeType of Object.values(trees)) {
        const tree = new treeType(context, projects);
        context.subscriptions.push(
            vscode.window.registerTreeDataProvider(treeType.getViewID(), tree as BaseTreeDataProvider<unknown>)
        );
    }

    // Register webview providers
    for (const webviewType of Object.values(webviews)) {
        const webview = new webviewType(context, projects);
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(webviewType.getViewID(), webview, {
                webviewOptions: webviewType.getWebviewOptions()
            })
        );
    }

    await projects.load();

    const toolRepo = ToolRepository.get(context);

    await toolRepo.applyTerminalContributions();

    if (toolRepo.shouldDoUpdateCheck() && node.isAvailable()) {
        // Check environment availability early, because the command might show an error to the user otherwise
        vscode.commands.executeCommand('edacation.checkToolUpdates');
    }
};

export const deactivate = () => {
    if (projects) {
        projects.dispose();
    }
};
