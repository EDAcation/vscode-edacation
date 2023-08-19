import * as vscode from 'vscode';

import * as util from '../util.js';

import {BaseEditor} from './base.js';
import {type ViewMessage} from './messages.js';

export class YosysEditor extends BaseEditor {
    private static activeViews: Set<vscode.Webview> = new Set();

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

        const fontUri = util.getWebviewUri(webview, this.context, [
            'views',
            'digitaljs',
            'dist',
            'assets',
            'codicon.ttf'
        ]);

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
        } else if (message.type === 'broadcast') {
            for (const view of YosysEditor.activeViews) {
                if (view === webview) {
                    continue;
                }
                view.postMessage(message);
            }
        } else if (message.type === 'requestSave') {
            // Save to project root, or the parent dir of the current editor's file if we can't find it
            const projectRoot = util.findProjectRoot(document.uri) || util.getParentUri(document.uri);
            const path = vscode.Uri.joinPath(projectRoot, message.data.defaultPath || '');

            util.offerSaveFile(message.data.fileContents, {
                defaultUri: path,
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
        console.log(YosysEditor.activeViews);
    }

    protected onClose(_document: vscode.TextDocument, webview: vscode.Webview): void {
        console.log('Editor closed!');
        YosysEditor.activeViews.delete(webview);
    }

    protected update(document: vscode.TextDocument, webview: vscode.Webview, isDocumentChange: boolean) {
        console.log('View becomes active! (maybe)');
        YosysEditor.activeViews.add(webview);

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
