import * as vscode from 'vscode';

import type {GlobalStoreMessage, ViewMessage} from '../types.js';
import {getWebviewUri} from '../util.js';

import {BaseEditor} from './base.js';

export class NextpnrEditor extends BaseEditor {
    public static getViewType() {
        return 'edacation.nextpnr';
    }

    protected getStylePaths() {
        return [['views', 'nextpnr', 'dist', 'assets', 'index.css']];
    }

    protected getScriptPaths() {
        return [['views', 'nextpnr', 'dist', 'assets', 'index.js']];
    }

    protected getHtmlStyles(webview: vscode.Webview): string {
        const styles = super.getHtmlStyles(webview);

        const fontUri = getWebviewUri(webview, this.context, ['views', 'nextpnr', 'dist', 'assets', 'codicon.ttf']);

        return `
            ${styles}
            <style>
                @font-face {
                    font-family: "codicon";
                    font-display: block;
                    src: url("${fontUri.toString()}") format("truetype");
                }
            </style>
        `;
    }

    protected async onDidReceiveMessage(
        document: vscode.TextDocument,
        webview: vscode.Webview,
        message: ViewMessage | GlobalStoreMessage
    ): Promise<boolean> {
        if (await super.onDidReceiveMessage(document, webview, message)) {
            return true;
        }
        if (message.type === 'ready') {
            await webview.postMessage({
                type: 'document',
                document: document.getText()
            });
            return true;
        }

        return false;
    }

    protected onSave(_document: vscode.TextDocument, _webview: vscode.Webview): void {
        // Do nothing
    }

    protected onClose(_document: vscode.TextDocument, _webview: vscode.Webview): void {
        // Do nothing
    }

    protected async update(document: vscode.TextDocument, webview: vscode.Webview, isDocumentChange: boolean) {
        if (!isDocumentChange) {
            await vscode.commands.executeCommand('edacation-projects.focus');
        }

        await webview.postMessage({
            type: 'document',
            document: document.getText()
        });
    }
}
