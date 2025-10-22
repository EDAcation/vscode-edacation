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

interface Extension {
    id: string;
    name: string;
    nativeOnly: boolean;
}

const RECOMMENDED_EXTENSIONS: Extension[] = [
    {
        id: 'sndst00m.vscode-native-svg-preview',
        name: 'SVG Preview',
        nativeOnly: true
    },
    {
        id: 'surfer-project.surfer',
        name: 'Surfer',
        nativeOnly: true
    }
];
const INITIALIZED_KEY = 'edacation-initialized';

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
        const tree = new treeType(context, projects) as BaseTreeDataProvider<unknown>;
        context.subscriptions.push(vscode.window.createTreeView(treeType.getViewID(), tree.getTreeViewOptions()));
    }

    // Register webview providers
    for (const webviewType of Object.values(webviews)) {
        const webview = new webviewType(context, projects);
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(webviewType.getViewID(), webview, {
                webviewOptions: webviewType.getWebviewOptions()
            })
        );
        context.subscriptions.push(
            vscode.window.registerWebviewPanelSerializer(webviewType.getViewID(), webview.getWebviewPanelSerializer())
        );
    }

    await projects.load();

    // Apply tools to terminal and check for updates
    const toolRepo = ToolRepository.get(context);
    await toolRepo.applyTerminalContributions();
    if (toolRepo.shouldDoUpdateCheck() && node.isAvailable()) {
        // Check environment availability early, because the command might show an error to the user otherwise
        vscode.commands.executeCommand('edacation.checkToolUpdates');
    }

    // Check for and ask to install recommended extensions
    const isInitialized = context.globalState.get<boolean>(INITIALIZED_KEY, false);
    if (!isInitialized) {
        const notInstalled: Extension[] = [];
        for (const ext of RECOMMENDED_EXTENSIONS) {
            if (ext.nativeOnly && !node.isAvailable()) continue;

            const info = vscode.extensions.getExtension(ext.id);
            if (info === undefined) notInstalled.push(ext);
        }

        if (notInstalled.length > 0) {
            const extensions = notInstalled.map((ext) => ext.name).join(', ');

            // Do not await so the extension can continue initializing
            vscode.window
                .showInformationMessage(
                    `EDAcation recommends installing the following extensions for additional functionality: ${extensions}`,
                    'Install now',
                    'Ignore'
                )
                .then(async (value) => {
                    if (value !== 'Install now') {
                        await context.globalState.update(INITIALIZED_KEY, true);
                        return;
                    }

                    // Trigger install by extension id
                    await Promise.allSettled(
                        notInstalled.map((ext) =>
                            vscode.commands.executeCommand('workbench.extensions.installExtension', ext.id)
                        )
                    );
                });
        }
    }
};

export const deactivate = () => {
    if (projects) {
        projects.dispose();
    }
};
