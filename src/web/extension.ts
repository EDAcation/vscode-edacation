import * as vscode from 'vscode';

import * as commands from './commands';
import * as editors from './editors';
import {Projects} from './projects';
import * as trees from './trees';
import {BaseTreeDataProvider} from './trees/base';

export const activate = async (context: vscode.ExtensionContext) => {
    const projects = new Projects(context);

    // Register commands
    for (const commandType of Object.values(commands)) {
        const command = new commandType(context, projects);
        context.subscriptions.push(vscode.commands.registerCommand(commandType.getID(), command.execute.bind(command)));
    }

    // Register custom editors
    for (const editorType of Object.values(editors)) {
        const editor = new editorType(context, projects);
        context.subscriptions.push(vscode.window.registerCustomEditorProvider(editorType.getViewType(), editor));
    }

    // Register tree data providers
    for (const treeType of Object.values(trees)) {
        const tree = new treeType(context, projects);
        context.subscriptions.push(vscode.window.registerTreeDataProvider(treeType.getViewID(), tree as BaseTreeDataProvider<unknown>));
    }

    await projects.load();
};

export const deactivate = () => {};
