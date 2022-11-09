import * as vscode from 'vscode';

export const getWebviewUri = (webview: vscode.Webview, context: vscode.ExtensionContext, path: string[]) => {
    return webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, ...path));
};

export const ensureFile = async (uri: vscode.Uri, exists: boolean) => {
    try {
        const stat = await vscode.workspace.fs.stat(uri);

        if (!exists) {
            if ((stat.type & vscode.FileType.Directory) !== 0) {
                await vscode.window.showErrorMessage(`A directory called "${uri.fsPath}" already exists.`, {
                    modal: true
                });
            } else {
                await vscode.window.showErrorMessage(`A file called "${uri.fsPath}" already exists.`, {
                    modal: true
                });
            }
        }
    } catch (err) {
        if (err instanceof vscode.FileSystemError && err.code === 'FileNotFound') {
            if (exists) {
                await vscode.window.showErrorMessage(`File "${uri}" does not exist.`, {
                    modal: true
                });
            }
        } else {
            throw err;
        }
    }
};

export const ensureFilePresent = (uri: vscode.Uri) => ensureFile(uri, true);
export const ensureFileAbsent = (uri: vscode.Uri) => ensureFile(uri, false);

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export const encodeText = (input: string) => textEncoder.encode(input.endsWith('\n') ? input : `${input}\n`);
export const encodeJSON = (input: unknown) => encodeText(JSON.stringify(input));

export const decodeText = (input: BufferSource) => textDecoder.decode(input);
export const decodeJSON = (input: BufferSource) => JSON.parse(decodeText(input));
