import {BaseEditor} from './base';

export class ProjectEditor extends BaseEditor {

    public static getViewType() {
        return 'edacation.project';
    }

    protected onDidReceiveMessage(message: any): void {
        console.log(message);
    }
}
