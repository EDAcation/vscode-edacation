import * as vscode from 'vscode';

import {getWebviewUri, offerSaveFile} from '../util.js';

import {BaseEditor} from './base.js';

export class DigitalJSEditor extends BaseEditor {
    public static getViewType() {
        return 'edacation.digitaljs';
    }

    protected getStylePaths() {
        return [['views', 'digitaljs', 'dist', 'assets', 'index.css']];
    }

    protected getScriptPaths() {
        return [['views', 'digitaljs', 'dist', 'assets', 'index.js']];
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

    protected onDidReceiveMessage(
        document: vscode.TextDocument,
        webview: vscode.Webview,
        message: Record<string, unknown>
    ): void {
        if (message.type === 'ready') {
            webview.postMessage({
                type: 'document',
                document: document.getText()
            });
        } else if (message.type === 'requestSave') {
            // TODO: figure out better way to save relative to project root
            const rootPath = vscode.workspace.workspaceFolders?.[0].uri || vscode.Uri.file('.');
            // @ts-expect-error: TODO: add type
            const path = vscode.Uri.joinPath(rootPath, message.data?.defaultPath || '');

            // @ts-expect-error: TODO: add type
            offerSaveFile(message.data.fileContents, {
                defaultUri: path,
                // @ts-expect-error: TODO: add type
                filters: message.data?.filters
            }).then((path) => {
                if (!path) {
                    return;
                }
                this.showSaveNotification(path);
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

    async showSaveNotification(path: vscode.Uri) {
        const response = await vscode.window.showInformationMessage('Export success', 'Open file');
        if (!response) {
            return;
        }

        const doc = await vscode.workspace.openTextDocument(path);
        await vscode.window.showTextDocument(doc);
    }
}
