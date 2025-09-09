import * as vscode from 'vscode';

import type {ViewMessage} from '../types.js';

import {BaseWebviewViewProvider} from './base.js';

export class ActionsProvider extends BaseWebviewViewProvider {
    public static getViewID() {
        return 'edacation-actions';
    }

    public static getTitle() {
        return 'EDAcation Actions';
    }

    protected getStylePaths() {
        return [['dist', 'views', 'actions', 'index.css']];
    }

    protected getScriptPaths() {
        return [['dist', 'views', 'actions', 'index.js']];
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
