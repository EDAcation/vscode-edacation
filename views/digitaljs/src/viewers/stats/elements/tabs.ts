import {CustomElement} from './base';

interface Tab<EventsDictionary> {
    title: string;
    element: CustomElement<EventsDictionary>;
}

export class TabsContainer extends CustomElement<Record<string, never>> {
    protected rootElem: HTMLElement;

    private tabs: Tab<unknown>[];

    constructor(tabs: Tab<unknown>[]) {
        super();

        this.tabs = tabs;

        this.rootElem = this.createRoot();
    }

    private createRoot(): HTMLElement {
        const root = document.createElement('vscode-panels');

        for (let i = 0; i < this.tabs.length; i++) {
            const tab = document.createElement('vscode-panel-tab');
            tab.id = `tab-${i}`;
            tab.textContent = this.tabs[i].title;
            root.appendChild(tab);
        }
        for (let i = 0; i < this.tabs.length; i++) {
            const view = document.createElement('vscode-panel-view');
            view.id = `view-${i}`;
            view.appendChild(this.tabs[i].element.element);
            root.appendChild(view);
        }

        return root;
    }

    render(): void {
        for (const tab of this.tabs) {
            tab.element.render();
        }
    }
}
