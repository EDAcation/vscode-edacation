import type * as vscode from 'vscode';

import {
    type OpenProjectsChannel,
    type OpenProjectsPortal,
    type ProjectEventChannel,
    type ProjectEventPortal
} from '../exchange.js';

import {type Projects} from './projects/projects.js';
import {getWebviewUri} from './util.js';

export abstract class BaseWebview<Args = Record<string, never>> {
    protected readonly context: vscode.ExtensionContext;
    protected readonly projects: Projects;

    protected readonly projectEventChannel: ProjectEventChannel;
    protected projectEventPortal?: ProjectEventPortal;
    protected readonly openProjectsChannel: OpenProjectsChannel;
    protected openProjectsPortal?: OpenProjectsPortal;

    public static getWebviewOptions(): vscode.WebviewPanelOptions {
        return {retainContextWhenHidden: true};
    }

    constructor(context: vscode.ExtensionContext, projects: Projects) {
        this.context = context;
        this.projects = projects;
        this.projectEventChannel = this.projects.createProjectEventChannel();
        this.openProjectsChannel = this.projects.createOpenProjectsChannel();
    }

    protected getHtmlForWebview(webview: vscode.Webview, args: Args): string {
        const initialData = JSON.stringify(JSON.stringify(this.getInitialData(args)));

        return /*html*/ `
            <!doctype html>
            <html lang="en">
                <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">

                    ${this.getHtmlStyles(webview)}
                </head>
                <body>
                    <div id="app">
                        <vscode-progress-ring></vscode-progress-ring>
                    </div>

                    ${this.getHtmlScripts(webview)}
                    ${
                        initialData
                            ? /*html*/ `<script type="application/javascript">window.initialData = JSON.parse(${initialData});</script>`
                            : ''
                    }
                </body>
            </html>
        `;
    }

    protected connectWebview(webview: vscode.Webview) {
        this.projectEventPortal = this.projects.attachProjectEventPortal((value) => void webview.postMessage(value));
        this.openProjectsPortal = this.projects.attachOpenProjectsPortal((value) => void webview.postMessage(value));

        webview.onDidReceiveMessage((message) => {
            if (this.projectEventPortal) this.projectEventPortal.handleMessage(message);
            if (this.openProjectsPortal) this.openProjectsPortal.handleMessage(message);
        });
    }

    protected disconnectWebview() {
        if (this.projectEventPortal) this.projectEventPortal.detach();
        if (this.openProjectsPortal) this.openProjectsPortal.detach();
    }

    protected getInitialData(_args: Args): Record<string, unknown> | undefined {
        return undefined;
    }

    protected getHtmlStyles(webview: vscode.Webview): string {
        const stylePaths = this.getStylePaths();
        const styleUris = stylePaths.map((style) => {
            if (Array.isArray(style)) {
                return {id: null, uri: getWebviewUri(webview, this.context, style)};
            } else {
                return {id: style.id, uri: getWebviewUri(webview, this.context, style.path)};
            }
        });

        return styleUris
            .map((styleUri) => {
                if (styleUri.id !== null) {
                    return /*html*/ `<link id="${styleUri.id}" rel="stylesheet" type="text/css" href="${styleUri.uri.toString()}">`;
                } else {
                    return /*html*/ `<link rel="stylesheet" type="text/css" href="${styleUri.uri.toString()}">`;
                }
            })
            .join('\n');
    }

    protected getHtmlScripts(webview: vscode.Webview): string {
        const scriptPaths = this.getScriptPaths();
        const scriptUris = scriptPaths.map((scriptPath) => getWebviewUri(webview, this.context, scriptPath));

        return scriptUris
            .map((scriptUri) => /*html*/ `<script type="module" src="${scriptUri.toString()}" defer></script>`)
            .join('\n');
    }

    protected abstract getStylePaths(): (string[] | {path: string[]; id: string})[];

    protected abstract getScriptPaths(): string[][];
}
