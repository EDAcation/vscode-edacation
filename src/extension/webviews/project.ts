import * as vscode from 'vscode';

import type {ViewMessage} from '../types.js';

import {BaseWebviewViewProvider} from './base.js';

export class ProjectProvider extends BaseWebviewViewProvider {
    public static getViewID() {
        return 'edacation.project';
    }

    public static getTitle() {
        return 'EDA Project Configuration';
    }

    protected getStylePaths() {
        return [];
    }

    protected getScriptPaths() {
        return [['dist', 'views', 'project', 'index.js']];
    }

    protected getInitialData(): Record<string, unknown> {
        return {
            project: undefined
        };
    }

    protected async onDidReceiveMessage(_webview: vscode.Webview, message: ViewMessage): Promise<void> {
        if (message.type === 'command') {
            await vscode.commands.executeCommand(message.command, ...(message.args ?? []));
        }
    }
}
