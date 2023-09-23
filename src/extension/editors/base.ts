import * as vscode from 'vscode';

import type {Projects} from '../projects/index.js';
import {getWebviewUri} from '../util.js';

import type {GlobalStoreMessage, ViewMessage} from './messages.js';

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

    public resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): void | Thenable<void> {
        const disposables: vscode.Disposable[] = [];
        const webview = webviewPanel.webview;

        // Render webview
        webview.options = {
            enableScripts: true
        };
        webview.html = this.getHtmlForWebview(webview, document);

        // Add message listener
        webview.onDidReceiveMessage(this.onDidReceiveMessage.bind(this, document, webview));

        // Add text document listener
        disposables.push(
            vscode.workspace.onDidChangeTextDocument((event) => {
                if (event.document.uri.toString() === document.uri.toString()) {
                    this.update(document, webview, true);
                }
            })
        );
        disposables.push(
            vscode.workspace.onDidSaveTextDocument((event) => {
                if (event.uri.toString() === document.uri.toString()) {
                    this.onSave(document, webview);
                }
            })
        );

        // Create file system watcher
        const watcher = vscode.workspace.createFileSystemWatcher(document.uri.fsPath);
        watcher.onDidCreate(() => this.update(document, webview, true));
        watcher.onDidChange(() => this.update(document, webview, true));
        watcher.onDidDelete(() => this.update(document, webview, true));
        disposables.push(watcher);

        // Add dispose listener
        webviewPanel.onDidDispose(() => {
            this.onClose(document, webview);

            for (const disposable of disposables) {
                disposable.dispose();
            }
        });

        // Update document
        this.update(document, webview, false);
    }

    protected getHtmlForWebview(webview: vscode.Webview, document: vscode.TextDocument): string {
        const initialData = JSON.stringify(JSON.stringify(this.getInitialData(document)));

        return /*html*/ `
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
                    ${
                        initialData
                            ? /*html*/ `<script type="application/javascript">window.initialData = JSON.parse(${initialData});</script>`
                            : ''
                    }
                </body>
            </html>
        `;
    }

    protected getInitialData(_document: vscode.TextDocument): Record<string, unknown> | undefined {
        return undefined;
    }

    protected getHtmlStyles(webview: vscode.Webview): string {
        const stylePaths = this.getStylePaths();
        const styleUris = stylePaths.map((stylePath) => getWebviewUri(webview, this.context, stylePath));

        return styleUris
            .map((styleUri) => /*html*/ `<link rel="stylesheet" type="text/css" href="${styleUri}">`)
            .join('\n');
    }

    protected getHtmlScripts(webview: vscode.Webview): string {
        const scriptPaths = this.getScriptPaths();
        const scriptUris = scriptPaths.map((scriptPath) => getWebviewUri(webview, this.context, scriptPath));

        return scriptUris
            .map((scriptUri) => /*html*/ `<script type="module" src="${scriptUri}" defer></script>`)
            .join('\n');
    }

    protected onDidReceiveMessage(
        _document: vscode.TextDocument,
        webview: vscode.Webview,
        message: ViewMessage | GlobalStoreMessage
    ): boolean {
        if (message.type === 'globalStore') {
            if (message.action === 'set') {
                this.context.globalState.update(message.name, message.value).then(() => {
                    const response: GlobalStoreMessage = {
                        type: 'globalStore',
                        action: 'result',
                        transaction: message.transaction
                    };
                    webview.postMessage(response);
                });
                return true;
            } else if (message.action === 'get') {
                const value = this.context.globalState.get(message.name) || ({} as object);
                const response: GlobalStoreMessage = {
                    type: 'globalStore',
                    action: 'result',
                    transaction: message.transaction,
                    result: value
                };
                webview.postMessage(response);

                return true;
            }
        }

        return false;
    }

    protected abstract getStylePaths(): string[][];

    protected abstract getScriptPaths(): string[][];

    protected abstract onSave(document: vscode.TextDocument, webview: vscode.Webview): void;

    protected abstract onClose(document: vscode.TextDocument, webview: vscode.Webview): void;

    protected abstract update(document: vscode.TextDocument, webview: vscode.Webview, isDocumentChange: boolean): void;
}
