import * as vscode from 'vscode';

import type {Projects} from '../projects/index.js';
import {type ViewMessage} from '../types.js';
import {BaseWebview} from '../webview.js';

export abstract class BaseWebviewViewProvider extends BaseWebview implements vscode.WebviewViewProvider {
    private static readonly activePanels: Map<string, vscode.WebviewPanel[]> = new Map();

    constructor(context: vscode.ExtensionContext, projects: Projects) {
        super(context, projects);
    }

    static getViewID(): string {
        throw new Error('Not implemented.');
    }

    static getTitle(): string {
        throw new Error('Not implemented.');
    }

    static isSingleton(): boolean {
        return false;
    }

    static getViewPanelColumn(): vscode.ViewColumn {
        return vscode.ViewColumn.Active;
    }

    protected abstract onDidReceiveMessage(webview: vscode.Webview, message: ViewMessage): Promise<void>;

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext<unknown>,
        _token: vscode.CancellationToken
    ): void | Thenable<void> {
        this.initWebview(webviewView);
    }

    public showAsPanel(): void {
        const curclass = this.constructor as typeof BaseWebviewViewProvider;
        const existingPanels = curclass.activePanels.get(curclass.getViewID()) ?? [];

        if (curclass.isSingleton() && existingPanels.length > 0) {
            // Instance limit reached, reveal existing instance instead
            // Note that we only support singleton checking, so the array must have length == 1
            existingPanels[0].reveal(curclass.getViewPanelColumn());
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            curclass.getViewID(),
            curclass.getTitle(),
            {
                viewColumn: curclass.getViewPanelColumn()
            },
            curclass.getWebviewOptions()
        );

        this.initWebview(panel);
    }

    public getWebviewPanelSerializer(): vscode.WebviewPanelSerializer {
        return {
            deserializeWebviewPanel: async (webviewPanel: vscode.WebviewPanel, _state: never) => {
                this.initWebview(webviewPanel);
            }
        };
    }

    protected initWebview(viewOrPanel: vscode.WebviewView | vscode.WebviewPanel): void {
        // Track panel instances
        const isPanel = 'reveal' in viewOrPanel;
        if (isPanel) {
            const curclass = this.constructor as typeof BaseWebviewViewProvider;
            const existingPanels = curclass.activePanels.get(curclass.getViewID()) ?? [];
            existingPanels.push(viewOrPanel);
            curclass.activePanels.set(curclass.getViewID(), existingPanels);

            viewOrPanel.onDidDispose(() => {
                const panels = curclass.activePanels.get(curclass.getViewID()) ?? [];
                const idx = panels.indexOf(viewOrPanel);
                if (idx >= 0) {
                    panels.splice(idx, 1);
                    curclass.activePanels.set(curclass.getViewID(), panels);
                }
            });
        }

        // Render webview
        viewOrPanel.webview.options = {
            enableScripts: true
        };
        viewOrPanel.webview.html = this.getHtmlForWebview(viewOrPanel.webview, {});

        // Add message listener
        viewOrPanel.webview.onDidReceiveMessage(this.onDidReceiveMessage.bind(this, viewOrPanel.webview));

        // Hook up exchange portals
        this.connectWebview(viewOrPanel.webview);
        viewOrPanel.onDidDispose((_) => this.disconnectWebview());
    }
}
