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

    public resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, _token: vscode.CancellationToken): void | Thenable<void> {
        webviewPanel.webview.options = {
            enableScripts: true
        };

        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        webviewPanel.onDidChangeViewState(this.onDidChangeViewState);
        webviewPanel.webview.onDidReceiveMessage(this.onDidReceiveMessage);

        this.update(document, webviewPanel);
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const stylePath = this.getStylePath();
        const scriptPath = this.getScriptPath();

        const styleUri = stylePath && getWebviewUri(webview, this.context, stylePath);
        const scriptUri = scriptPath && getWebviewUri(webview, this.context, scriptPath);

        return /*html*/`
            <!doctype html>
            <html lang="en">
                <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                    ${styleUri ? /*html*/`<link rel="stylesheet" type="text/css" href="${styleUri}">` : ''}
                </head>
                <body>
                    <div id="app"></div>

                    ${scriptUri ? /*html*/`<script type="module" src="${scriptUri}"></script>` : ''}
                </body>
            </html>
        `;
    }

    protected onDidChangeViewState(_event: vscode.WebviewPanelOnDidChangeViewStateEvent) {
        // this.update(event.webviewPanel);
        // TODO: update?
    }

    protected abstract getStylePath(): string[] | undefined;

    protected abstract getScriptPath(): string[] | undefined;

    protected abstract onDidReceiveMessage(message: any): void;

    protected abstract update(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel): void;
}
