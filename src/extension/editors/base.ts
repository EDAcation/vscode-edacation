import * as vscode from 'vscode';

import type {Projects} from '../projects/index.js';
import type {GlobalStoreMessage, ViewMessage} from '../types.js';
import {BaseWebview} from '../webview.js';

export interface EditorWebviewArgs {
    document: vscode.TextDocument;
}

export abstract class BaseEditor extends BaseWebview<EditorWebviewArgs> implements vscode.CustomTextEditorProvider {
    constructor(context: vscode.ExtensionContext, projects: Projects) {
        super(context, projects);
    }

    static getViewType(): string {
        throw new Error('Not implemented.');
    }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        const disposables: vscode.Disposable[] = [];
        const webview = webviewPanel.webview;

        // Render webview
        webview.options = {
            enableScripts: true
        };
        webview.html = this.getHtmlForWebview(webview, {document});

        // Add message listener
        webview.onDidReceiveMessage(this.onDidReceiveMessage.bind(this, document, webview));

        // Add text document listener
        disposables.push(
            vscode.workspace.onDidChangeTextDocument((event) => {
                if (event.document.uri.toString() === document.uri.toString()) {
                    void this.update(document, webview, true);
                }
            })
        );
        disposables.push(
            vscode.workspace.onDidDeleteFiles((event) => {
                if (event.files.map((uri) => uri.toString()).includes(document.uri.toString())) {
                    void webviewPanel.dispose();
                }
            })
        );
        disposables.push(
            vscode.workspace.onDidSaveTextDocument((event) => {
                if (event.uri.toString() === document.uri.toString()) {
                    void this.onSave(document, webview);
                }
            })
        );

        // Hook up exchange portals
        this.connectWebview(webviewPanel.webview);
        webviewPanel.onDidDispose((_) => this.disconnectWebview());

        // Add dispose listener
        webviewPanel.onDidDispose(() => {
            this.onClose(document, webview);

            for (const disposable of disposables) {
                disposable.dispose();
            }
        });

        // Update document
        await this.update(document, webview, false);
    }

    protected async onDidReceiveMessage(
        _document: vscode.TextDocument,
        webview: vscode.Webview,
        message: ViewMessage | GlobalStoreMessage
    ): Promise<boolean> {
        if (message.type === 'globalStore') {
            if (message.action === 'set') {
                await this.context.globalState.update(message.name, message.value);
                const response: GlobalStoreMessage = {
                    type: 'globalStore',
                    action: 'result',
                    transaction: message.transaction
                };
                await webview.postMessage(response);

                return true;
            } else if (message.action === 'get') {
                const value = this.context.globalState.get(message.name) || ({} as object);
                const response: GlobalStoreMessage = {
                    type: 'globalStore',
                    action: 'result',
                    transaction: message.transaction,
                    result: value
                };
                await webview.postMessage(response);

                return true;
            }
        }

        return false;
    }

    protected abstract onSave(document: vscode.TextDocument, webview: vscode.Webview): Promise<void>;

    protected abstract onClose(document: vscode.TextDocument, webview: vscode.Webview): void;

    protected abstract update(
        document: vscode.TextDocument,
        webview: vscode.Webview,
        isDocumentChange: boolean
    ): Promise<void>;
}
