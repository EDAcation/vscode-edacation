import * as vscode from 'vscode';

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

    static getTitle(): string {
        throw new Error('Not implemented.');
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext<unknown>,
        _token: vscode.CancellationToken
    ): void | Thenable<void> {
        this.initWebview(webviewView);
    }

    public showAsPanel(): void {
        const curclass = this.constructor as typeof BaseWebviewViewProvider;
        const panel = vscode.window.createWebviewPanel(
            curclass.getViewID(),
            curclass.getTitle(),
            {
                viewColumn: vscode.ViewColumn.Beside
            },
            curclass.getWebviewOptions()
        );

        this.initWebview(panel);
    }

    protected initWebview(viewOrPanel: vscode.WebviewView | vscode.WebviewPanel): void {
        // Render webview
        viewOrPanel.webview.options = {
            enableScripts: true
        };
        viewOrPanel.webview.html = this.getHtmlForWebview(viewOrPanel.webview, {});

        // Add message listener
        viewOrPanel.webview.onDidReceiveMessage(this.onDidReceiveMessage.bind(this, viewOrPanel.webview));

        // Hook up exchange portals
        this.connectWebview(viewOrPanel.webview);
        viewOrPanel.onDidDispose((_) => this.disconnectWebview());
    }

    protected abstract onDidReceiveMessage(webview: vscode.Webview, message: ViewMessage): Promise<void>;
}
