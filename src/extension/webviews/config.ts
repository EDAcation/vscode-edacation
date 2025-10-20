import * as vscode from 'vscode';

import type {ViewMessage} from '../types.js';

import {BaseWebviewViewProvider} from './base.js';

export class QuickConfigProvider extends BaseWebviewViewProvider {
    public static getViewID() {
        return 'edacation-config';
    }

    public static getTitle() {
        return 'EDAcation Quick Config';
    }

    protected getStylePaths() {
        return [['dist', 'views', 'config', 'index.css']];
    }

    protected getScriptPaths() {
        return [['dist', 'views', 'config', 'index.js']];
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
