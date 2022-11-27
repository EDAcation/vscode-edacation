import * as vscode from 'vscode';

import {Project} from '../projects';
import {BaseEditor} from './base';

export class DigitalJSEditor extends BaseEditor {

    public static getViewType() {
        return 'edacation.digitaljs';
    }

    protected getStylePath(): string[] | undefined {
        return ['views', 'digitaljs', 'dist', 'assets', 'index.css'];
    }

    protected getScriptPath(): string[] | undefined {
        return ['views', 'digitaljs', 'dist', 'assets', 'index.js'];
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
