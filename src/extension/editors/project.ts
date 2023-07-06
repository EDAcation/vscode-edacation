import * as vscode from 'vscode';

import {Project} from '../projects/index.js';
import {type ViewMessage} from '../types.js';

import {BaseEditor} from './base.js';

export class ProjectEditor extends BaseEditor {
    public static getViewType() {
        return 'edacation.project';
    }

    protected getStylePaths() {
        return [
            // ['views', 'project', 'dist', 'assets', 'index.css']
        ];
    }

    protected getScriptPaths() {
        return [['views', 'project', 'dist', 'assets', 'index.js']];
    }

    protected getInitialData(document: vscode.TextDocument): Record<string, unknown> {
        const project = this.projects.get(document.uri);

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

    protected onDidReceiveMessage(document: vscode.TextDocument, webview: vscode.Webview, message: ViewMessage): void {
        console.log(message);

        if (message.type === 'ready') {
            const project = this.projects.get(document.uri);

            console.log('ready project', document.uri);

            if (project) {
                webview.postMessage({
                    type: 'project',
                    project: Project.serialize(project)
                });
            }
        } else if (message.type === 'change') {
            if (document.getText() === message.document) {
                return;
            }

            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), message.document as string);
            vscode.workspace.applyEdit(edit);
        }
    }

    protected async onSave(document: vscode.TextDocument, webview: vscode.Webview) {
        // Reload project
        await this.projects.reload(document.uri);

        this.update(document, webview, false);
    }

    protected update(document: vscode.TextDocument, webview: vscode.Webview, isDocumentChange: boolean) {
        if (isDocumentChange) {
            return;
        }

        vscode.commands.executeCommand('edacation-projects.focus');

        const project = this.projects.get(document.uri);

        console.log('updating project', project);

        if (project) {
            webview.postMessage({
                type: 'project',
                project: Project.serialize(project)
            });
        }
    }
}
