import type * as vscode from 'vscode';

import {getWebviewUri} from './util.js';

export abstract class BaseWebview<Args = Record<string, never>> {
    protected readonly context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
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

    protected getInitialData(_args: Args): Record<string, unknown> | undefined {
        return undefined;
    }

    protected getHtmlStyles(webview: vscode.Webview): string {
        const stylePaths = this.getStylePaths();
        const styleUris = stylePaths.map((stylePath) => getWebviewUri(webview, this.context, stylePath));

        return styleUris
            .map((styleUri) => /*html*/ `<link rel="stylesheet" type="text/css" href="${styleUri.toString()}">`)
            .join('\n');
    }

    protected getHtmlScripts(webview: vscode.Webview): string {
        const scriptPaths = this.getScriptPaths();
        const scriptUris = scriptPaths.map((scriptPath) => getWebviewUri(webview, this.context, scriptPath));

        return scriptUris
            .map((scriptUri) => /*html*/ `<script type="module" src="${scriptUri.toString()}" defer></script>`)
            .join('\n');
    }

    protected abstract getStylePaths(): string[][];

    protected abstract getScriptPaths(): string[][];
}
