import * as vscode from 'vscode';

import {BaseEditor} from './base';

export class ProjectEditor extends BaseEditor {

    protected onDidReceiveMessage(message: any): void {
        console.log(message);
    }
}
