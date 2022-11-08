import * as vscode from 'vscode';

import {ProjectEditor} from './editors/project';

export const activate = (context: vscode.ExtensionContext) => {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "edacation" is now active in the web extension host!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('edacation.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from EDAcation in a web extension host!');
	});

	context.subscriptions.push(disposable);

	context.subscriptions.push(vscode.window.registerCustomEditorProvider('edacation.project', new ProjectEditor(context)));
};

export const deactivate = () => {};
