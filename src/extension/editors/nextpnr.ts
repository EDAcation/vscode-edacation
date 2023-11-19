import * as vscode from 'vscode';

import {type ViewMessage} from '../types.js';
import {getWebviewUri} from '../util.js';

import {BaseEditor} from './base.js';

export class NextpnrEditor extends BaseEditor {
    public static getViewType() {
        return 'edacation.nextpnr';
    }

    protected getStylePaths() {
        return [['src', 'views', 'nextpnr', 'dist', 'assets', 'index.css']];
    }

    protected getScriptPaths() {
        return [['src', 'views', 'nextpnr', 'dist', 'assets', 'index.js']];
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
                    src: url("${fontUri}") format("truetype");
                }
            </style>
        `;
    }

    protected onDidReceiveMessage(document: vscode.TextDocument, webview: vscode.Webview, message: ViewMessage): void {
        if (message.type === 'ready') {
            webview.postMessage({
                type: 'document',
                document: document.getText()
            });
        }
    }

    protected onSave(_document: vscode.TextDocument, _webview: vscode.Webview): void {
        // Do nothing
    }

    protected update(document: vscode.TextDocument, webview: vscode.Webview, isDocumentChange: boolean) {
        if (!isDocumentChange) {
            vscode.commands.executeCommand('edacation-projects.focus');
        }

        webview.postMessage({
            type: 'document',
            document: document.getText()
        });
    }
}
