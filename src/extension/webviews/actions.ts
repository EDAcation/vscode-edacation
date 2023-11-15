import * as vscode from 'vscode';

import type {ViewMessage} from '../types.js';

import {BaseWebviewViewProvider} from './base.js';
import {Project} from '../projects/index.js';

export class ActionsProvider extends BaseWebviewViewProvider {
    public static getViewID() {
        return 'edacation-actions';
    }

    protected getStylePaths() {
        return [
            // ['views', 'actions', 'dist', 'assets', 'index.css']
        ];
    }

    protected getScriptPaths() {
        return [['views', 'actions', 'dist', 'assets', 'index.js']];
    }

    protected getInitialData(): Record<string, unknown> {
        return {
            project: undefined
        };
    }

    public resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext<unknown>, token: vscode.CancellationToken): void | Thenable<void> {
        super.resolveWebviewView(webviewView, context, token)

        // TODO: subscribe to project change
        // this.projects.getProjectEmitter().event.
    }

    protected onDidReceiveMessage(webview: vscode.Webview, message: ViewMessage): void {
        console.log('[actions]', message);

        if (message.type === 'ready') {
            const project = this.projects.getCurrent()
            if (!project) {
                return
            }

            console.log('[actions]', 'ready project', project.getUri());

            if (project) {
                webview.postMessage({
                    type: 'project',
                    project: Project.serialize(project)
                });
            }
        } else if (message.type === 'command') {
            vscode.commands.executeCommand(message.command);
        }
    }
}
