import * as vscode from 'vscode';

import {Project} from '../projects';
import {BaseEditor} from './base';

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
        return [
            ['views', 'project', 'dist', 'assets', 'index.js']
        ];
    }

    protected getInitialData(document: vscode.TextDocument) {
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

    protected onDidReceiveMessage(document: vscode.TextDocument, webview: vscode.Webview, message: any): void {
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
        }
    }

    protected update(document: vscode.TextDocument, webview: vscode.Webview) {
        vscode.commands.executeCommand('edacation-projects.focus');

        const project = this.projects.get(document.uri);

        console.log('updating project', document.uri);

        if (project) {
            webview.postMessage({
                type: 'project',
                project: Project.serialize(project)
            });
        }
    }
}
