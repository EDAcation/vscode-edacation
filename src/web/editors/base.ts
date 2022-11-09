import * as vscode from 'vscode';

import {Projects} from '../projects';
import {getWebviewUri} from '../util';

export abstract class BaseEditor implements vscode.CustomTextEditorProvider {

    protected readonly context: vscode.ExtensionContext;
    protected readonly projects: Projects;

    constructor(context: vscode.ExtensionContext, projects: Projects) {
        this.context = context;
        this.projects = projects;
    }

    static getViewType(): string {
        throw new Error('Not implemented.');
    }

    public resolveCustomTextEditor(_document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): void | Thenable<void> {
        webviewPanel.webview.options = {
            enableScripts: true
        };

        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        webviewPanel.webview.onDidReceiveMessage(this.onDidReceiveMessage);
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const styleUri = getWebviewUri(webview, this.context, ['views', 'project', 'dist', 'assets', 'index.css']);
        const scriptUri = getWebviewUri(webview, this.context, ['views', 'project', 'dist', 'assets', 'index.js']);

        return /*html*/`
            <!doctype html>
            <html lang="en">
                <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                    <link rel="stylesheet" type="text/css" href="${styleUri}">
                </head>
                <body>
                    <div id="app"></div>
                    <script type="module" src="${scriptUri}"></script>
                </body>
            </html>
        `;
    }

    protected abstract onDidReceiveMessage(message: any): void;
}
