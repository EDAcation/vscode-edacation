import * as vscode from 'vscode';

import {BaseEditor} from './base';

export class DigitalJSEditor extends BaseEditor {

    public static getViewType() {
        return 'edacation.digitaljs';
    }

    protected getStylePath() {
        return ['views', 'digitaljs', 'dist', 'assets', 'index.css'];
    }

    protected getScriptPath() {
        return ['views', 'digitaljs', 'dist', 'assets', 'index.js'];
    }

    protected getInitialData(document: vscode.TextDocument) {
        return {
            document: document.getText()
        };
    }

    protected onDidReceiveMessage(document: vscode.TextDocument, webview: vscode.Webview, message: any): void {
        console.log(message);

        if (message.type === 'ready') {
            webview.postMessage({
                type: 'document',
                document: document.getText()
            });
        }
    }

    protected update(document: vscode.TextDocument) {
        vscode.commands.executeCommand('edacation-projects.focus');

        console.log(document.uri);
    }
}
