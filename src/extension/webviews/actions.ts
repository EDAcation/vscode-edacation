import * as vscode from 'vscode';

import {Project} from '../projects/index.js';
import type {ViewMessage} from '../types.js';

import {BaseWebviewViewProvider} from './base.js';

export class ActionsProvider extends BaseWebviewViewProvider {
    public static getViewID() {
        return 'edacation-actions';
    }

    protected getStylePaths() {
        return [['dist', 'views', 'nextpnr', 'index.css']];
    }

    protected getScriptPaths() {
        return [['dist', 'views', 'actions', 'index.js']];
    }

    protected getInitialData(): Record<string, unknown> {
        return {
            project: undefined
        };
    }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext<unknown>,
        token: vscode.CancellationToken
    ): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        super.resolveWebviewView(webviewView, context, token);
    }

    protected async onDidReceiveMessage(webview: vscode.Webview, message: ViewMessage): Promise<void> {
        console.log('[actions]', message);

        if (message.type === 'ready') {
            const project = this.projects.getCurrent();
            if (!project) {
                return;
            }

            console.log('[actions]', 'ready project', project.getUri());

            await webview.postMessage({
                type: 'project',
                project: Project.serialize(project)
            });
        } else if (message.type === 'command') {
            await vscode.commands.executeCommand(message.command, ...(message.args ?? []));
        }
    }
}
