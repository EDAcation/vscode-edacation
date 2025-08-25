import * as vscode from 'vscode';

import type {ViewMessage} from '../types.js';

import {BaseWebviewViewProvider} from './base.js';

export class ActionsProvider extends BaseWebviewViewProvider {
    public static getViewID() {
        return 'edacation-actions';
    }

    protected getStylePaths() {
        return [['dist', 'views', 'nextpnr', 'index.css']];
    }

    protected getScriptPaths() {
        return [['dist', 'views', 'actions', 'index.js']];
    }

    protected getInitialData(): Record<string, unknown> {
        return {
            project: undefined
        };
    }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext<unknown>,
        token: vscode.CancellationToken
    ): Promise<void> {
        super.resolveWebviewView(webviewView, context, token);
    }

    protected async onDidReceiveMessage(_webview: vscode.Webview, message: ViewMessage): Promise<void> {
        if (message.type === 'command') {
            await vscode.commands.executeCommand(message.command, ...(message.args ?? []));
        }
    }
}
