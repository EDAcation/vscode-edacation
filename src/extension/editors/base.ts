import * as vscode from 'vscode';

import type {Projects} from '../projects/index.js';
import {type ViewMessage} from '../types.js';
import {BaseWebview} from '../webview.js';

export interface EditorWebviewArgs {
    document: vscode.TextDocument;
}

export abstract class BaseEditor extends BaseWebview<EditorWebviewArgs> implements vscode.CustomTextEditorProvider {
    protected readonly projects: Projects;

    constructor(context: vscode.ExtensionContext, projects: Projects) {
        super(context);
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

        // Render webview
        webviewPanel.webview.options = {
            enableScripts: true
        };
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, {document});

        // Add message listener
        webviewPanel.webview.onDidReceiveMessage(this.onDidReceiveMessage.bind(this, document, webviewPanel.webview));

        // Add text document listener
        disposables.push(
            vscode.workspace.onDidChangeTextDocument((event) => {
                if (event.document.uri.toString() === document.uri.toString()) {
                    this.update(document, webviewPanel.webview, true);
                }
            })
        );
        disposables.push(
            vscode.workspace.onDidSaveTextDocument((event) => {
                if (event.uri.toString() === document.uri.toString()) {
                    this.onSave(document, webviewPanel.webview);
                }
            })
        );

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

    protected abstract onDidReceiveMessage(
        document: vscode.TextDocument,
        webview: vscode.Webview,
        message: ViewMessage
    ): void;

    protected abstract onSave(document: vscode.TextDocument, webview: vscode.Webview): void;

    protected abstract update(document: vscode.TextDocument, webview: vscode.Webview, isDocumentChange: boolean): void;
}
