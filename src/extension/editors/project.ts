import * as vscode from 'vscode';

import {Project} from '../projects/index.js';
import type {GlobalStoreMessage, ViewMessage} from '../types.js';

import {BaseEditor, type EditorWebviewArgs} from './base.js';

export class ProjectEditor extends BaseEditor {
    public static getViewType() {
        return 'edacation.project';
    }

    protected getStylePaths() {
        return [];
    }

    protected getScriptPaths() {
        return [['dist', 'views', 'project', 'index.js']];
    }

    protected getInitialData(args: EditorWebviewArgs): Record<string, unknown> {
        const project = this.projects.get(args.document.uri);

        if (project) {
            return {
                project: Project.serialize(project)
            };
        } else {
            return {
                project: undefined
            };
        }
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
            const project = this.projects.get(document.uri);

            console.log('ready project', document.uri);

            if (project) {
                await webview.postMessage({
                    type: 'project',
                    project: Project.serialize(project)
                });
            }
            return true;
        } else if (message.type === 'change') {
            if (document.getText() === message.document) {
                return true;
            }

            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), message.document);
            await vscode.workspace.applyEdit(edit);

            return true;
        }

        return false;
    }

    protected async onSave(document: vscode.TextDocument, webview: vscode.Webview) {
        // Reload project
        await this.projects.reload(document.uri);

        await this.update(document, webview, false);
    }

    protected onClose(_document: vscode.TextDocument, _webview: vscode.Webview): void {
        // Do nothing
    }

    protected async update(document: vscode.TextDocument, webview: vscode.Webview, isDocumentChange: boolean) {
        if (isDocumentChange) {
            return;
        }

        await vscode.commands.executeCommand('edacation-projects.focus');

        const project = this.projects.get(document.uri);

        console.log('updating project', project);

        if (project) {
            await webview.postMessage({
                type: 'project',
                project: Project.serialize(project)
            });
        }
    }
}
