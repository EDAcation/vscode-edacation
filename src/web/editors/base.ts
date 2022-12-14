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
        const disposables: vscode.Disposable[] = [];

        // Render webview
        webviewPanel.webview.options = {
            enableScripts: true
        };
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, document);

        // Add message listener
        webviewPanel.webview.onDidReceiveMessage(this.onDidReceiveMessage.bind(this, document, webviewPanel.webview));

        // Add text document listener
        disposables.push(vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.document.uri.toString() === document.uri.toString()) {
                this.update(document, webviewPanel.webview, true);
            }
        }));
        disposables.push(vscode.workspace.onDidSaveTextDocument((event) => {
            if (event.uri.toString() === document.uri.toString()) {
                this.onSave(document, webviewPanel.webview);
            }
        }));

        // Create file system watcher
        const watcher = vscode.workspace.createFileSystemWatcher(document.uri.fsPath);
        watcher.onDidCreate(() => this.update(document, webviewPanel.webview, true));
        watcher.onDidChange(() => this.update(document, webviewPanel.webview, true));
        watcher.onDidDelete(() => this.update(document, webviewPanel.webview, true));
        disposables.push(watcher);

        // Add dispose listener
        webviewPanel.onDidDispose(() => {
            for (const disposable of disposables) {
                disposable.dispose();
            }
        });

        // Update document
        this.update(document, webviewPanel.webview, false);
    }

    protected getHtmlForWebview(webview: vscode.Webview, document: vscode.TextDocument): string {
        const initialData = JSON.stringify(JSON.stringify(this.getInitialData(document)));

        return /*html*/`
            <!doctype html>
            <html lang="en">
                <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                    ${this.getHtmlStyles(webview)}
                </head>
                <body>
                    <div id="app">
                        <vscode-progress-ring></vscode-progress-ring>
                    </div>

                    ${this.getHtmlScripts(webview)}
                    ${initialData ? /*html*/`<script type="application/javascript">window.initialData = JSON.parse(${initialData});</script>` : ''}
                </body>
            </html>
        `;
    }

    protected getInitialData(_document: vscode.TextDocument): any | undefined {
        return undefined;
    }

    protected getHtmlStyles(webview: vscode.Webview): string {
        const stylePaths = this.getStylePaths();
        const styleUris = stylePaths.map((stylePath) => getWebviewUri(webview, this.context, stylePath));

        return styleUris.map((styleUri) => /*html*/`<link rel="stylesheet" type="text/css" href="${styleUri}">`).join('\n');
    }

    protected getHtmlScripts(webview: vscode.Webview): string {
        const scriptPaths = this.getScriptPaths();
        const scriptUris = scriptPaths.map((scriptPath) => getWebviewUri(webview, this.context, scriptPath));

        return scriptUris.map((scriptUri) => /*html*/`<script type="module" src="${scriptUri}" defer></script>`).join('\n');
    }

    protected abstract getStylePaths(): string[][];

    protected abstract getScriptPaths(): string[][];

    protected abstract onDidReceiveMessage(document: vscode.TextDocument, webview: vscode.Webview, message: any): void;

    protected abstract onSave(document: vscode.TextDocument, webview: vscode.Webview): void;

    protected abstract update(document: vscode.TextDocument, webview: vscode.Webview, isDocumentChange: boolean): void;
}
