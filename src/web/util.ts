import path from 'path';
import * as vscode from 'vscode';

export const getWebviewUri = (webview: vscode.Webview, context: vscode.ExtensionContext, path: string[]): vscode.Uri => {
    const uri = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, ...path));
    console.log(context.extensionUri.toString(), ...path, uri.toString());
    return uri;
};

export const ensureFile = async (uri: vscode.Uri, exists: boolean): Promise<void> => {
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
export const encodeJSON = (input: unknown, pretty: boolean = false) => encodeText(JSON.stringify(input, undefined, pretty ? 4 : undefined));

export const decodeText = (input: BufferSource) => textDecoder.decode(input);
export const decodeJSON = (input: BufferSource) => JSON.parse(decodeText(input));

export const FILE_EXTENSIONS_VERILOG = ['v', 'vh', 'sv', 'svh'];
export const FILE_EXTENSIONS_VHDL = ['vhd'];

export const FILE_FILTERS_HDL = {
    /* eslint-disable-next-line @typescript-eslint/naming-convention */
    'HDL (*.v, *.vh, *.sv, *.svh, *.vhd)': [...FILE_EXTENSIONS_VERILOG, ...FILE_EXTENSIONS_VHDL],
};

export const asWorkspaceRelativeFolderPath = (folderUri: vscode.Uri) =>
    path.dirname(vscode.workspace.asRelativePath(vscode.Uri.joinPath(folderUri, '__root__'), true));

export const getWorkspaceRelativePath = (folderUri: vscode.Uri, fileUri: vscode.Uri): [string, string] | [undefined, undefined] => {
    const workspaceRelativeFolder = asWorkspaceRelativeFolderPath(folderUri);
    const workspaceRelativePath = vscode.workspace.asRelativePath(fileUri, true);

    console.log(workspaceRelativeFolder, workspaceRelativePath);

    if (workspaceRelativePath !== workspaceRelativeFolder && !workspaceRelativePath.startsWith(`${workspaceRelativeFolder}/`)) {
        return [undefined, undefined];
    }

    const folderRelativePath = workspaceRelativePath === workspaceRelativeFolder ? '.' :
        workspaceRelativePath.replace(new RegExp(`^${workspaceRelativeFolder}/`), './');

    return [workspaceRelativePath, folderRelativePath];
};

export const keysForEnum = <M extends Record<string, unknown>>(map: M): [keyof M, ...(keyof M)[]] => Object.keys(map) as unknown as [keyof M, ...(keyof M)[]];
