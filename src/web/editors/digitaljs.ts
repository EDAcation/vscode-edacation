import * as vscode from 'vscode';
import {getWebviewUri} from '../util';

import {BaseEditor} from './base';

export class DigitalJSEditor extends BaseEditor {

    public static getViewType() {
        return 'edacation.digitaljs';
    }

    protected getStylePaths() {
        return [
            ['views', 'digitaljs', 'dist', 'assets', 'index.css']
        ];
    }

    protected getScriptPaths() {
        return [
            ['views', 'digitaljs', 'dist', 'assets', 'index.js']
        ];
    }

    protected getHtmlStyles(webview: vscode.Webview): string {
        const styles = super.getHtmlStyles(webview);

        const fontUri = getWebviewUri(webview, this.context, ['views', 'digitaljs', 'dist', 'assets', 'codicon.ttf']);

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

    protected onDidReceiveMessage(document: vscode.TextDocument, webview: vscode.Webview, message: any): void {
        if (message.type === 'ready') {
            webview.postMessage({
                type: 'document',
                document: document.getText()
            });
        }
    }

    protected update(document: vscode.TextDocument, webview: vscode.Webview) {
        vscode.commands.executeCommand('edacation-projects.focus');

        webview.postMessage({
            type: 'document',
            document: document.getText()
        });
    }
}
