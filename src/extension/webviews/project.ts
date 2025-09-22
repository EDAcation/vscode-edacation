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

    public static isSingleton(): boolean {
        return true;
    }

    public static getViewPanelColumn(): vscode.ViewColumn {
        return vscode.ViewColumn.Beside;
    }

    protected getStylePaths() {
        return [{id: 'vscode-codicon-stylesheet', path: ['dist', 'views', 'project', 'index.css']}];
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
