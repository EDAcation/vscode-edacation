import * as vscode from 'vscode';

import type {GlobalStoreMessage, ViewMessage} from '../types.js';
import * as util from '../util.js';

import {BaseEditor, type EditorWebviewArgs} from './base.js';

export class ProjectFileEditor extends BaseEditor {
    public static getViewType() {
        return 'edacation.project-file';
    }

    protected getStylePaths() {
        return [
            ['dist', 'views', 'project-file', 'index.css'],
            {id: 'vscode-codicon-stylesheet', path: ['dist', 'views', 'actions', 'index.css']}
        ];
    }

    protected getScriptPaths() {
        return [['dist', 'views', 'project-file', 'index.js']];
    }

    protected getHtmlStyles(webview: vscode.Webview): string {
        const styles = super.getHtmlStyles(webview);

        const fontUri = util.getWebviewUri(webview, this.context, ['dist', 'views', 'codicon.ttf']);

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

        if (message.type === 'command') {
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            await vscode.commands.executeCommand(message.command, ...(message.args ?? []));
            return true;
        }

        return false;
    }

    protected getInitialData(args: EditorWebviewArgs): Record<string, string> {
        return {fileUri: args.document.uri.toString()};
    }

    protected async onSave(_document: vscode.TextDocument, _webview: vscode.Webview): Promise<void> {}

    protected onClose(_document: vscode.TextDocument, _webview: vscode.Webview): void {}

    protected async update(_document: vscode.TextDocument, _webview: vscode.Webview) {}
}
