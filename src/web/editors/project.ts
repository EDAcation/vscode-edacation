import * as vscode from 'vscode';

import {Project} from '../projects';
import {BaseEditor} from './base';

export class ProjectEditor extends BaseEditor {

    public static getViewType() {
        return 'edacation.project';
    }

    protected getStylePath() {
        return ['views', 'project', 'dist', 'assets', 'index.css'];
    }

    protected getScriptPath() {
        return ['views', 'project', 'dist', 'assets', 'index.js'];
    }

    protected getInitialData(_document: vscode.TextDocument) {
        return undefined;
    }

    protected onDidReceiveMessage(message: any): void {
        console.log(message);
    }

    protected update(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel) {
        vscode.commands.executeCommand('edacation-projects.focus');

        const project = this.projects.get(document.uri);
        console.log(project);
        if (project) {
            // TODO: update from document?

            webviewPanel.webview.postMessage({
                type: 'project',
                project: Project.serialize(project)
            });
        } else {
            // TODO: show open document button or just read it?
        }
    }
}
