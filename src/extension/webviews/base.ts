import type * as vscode from 'vscode';

import type {Projects} from '../projects/index.js';
import {type ViewMessage} from '../types.js';
import {BaseWebview} from '../webview.js';

export abstract class BaseWebviewViewProvider extends BaseWebview implements vscode.WebviewViewProvider {
    constructor(context: vscode.ExtensionContext, projects: Projects) {
        super(context, projects);
    }

    static getViewID(): string {
        throw new Error('Not implemented.');
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext<unknown>,
        _token: vscode.CancellationToken
    ): void | Thenable<void> {
        // Render webview
        webviewView.webview.options = {
            enableScripts: true
        };
        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview, {});

        // Add message listener
        webviewView.webview.onDidReceiveMessage(this.onDidReceiveMessage.bind(this, webviewView.webview));

        // Hook up exchange portals
        this.connectWebview(webviewView.webview);
        webviewView.onDidDispose((_) => this.disconnectWebview());
    }

    protected abstract onDidReceiveMessage(webview: vscode.Webview, message: ViewMessage): Promise<void>;
}
