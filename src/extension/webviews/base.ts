import type * as vscode from 'vscode';

import type {Projects} from '../projects/index.js';
import {type ViewMessage} from '../types.js';
import {BaseWebview} from '../webview.js';

export abstract class BaseWebviewViewProvider extends BaseWebview implements vscode.WebviewViewProvider {
    protected readonly projects: Projects;

    constructor(context: vscode.ExtensionContext, projects: Projects) {
        super(context);
        this.projects = projects;
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
    }

    protected abstract onDidReceiveMessage(webview: vscode.Webview, message: ViewMessage): void;
}
