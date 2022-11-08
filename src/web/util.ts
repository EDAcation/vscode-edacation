import * as vscode from 'vscode';

export const getWebviewUri = (webview: vscode.Webview, context: vscode.ExtensionContext, path: string[]) => {
    return webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, ...path));
};
