import {CustomElement} from './base';

interface Tab<EventsDictionary> {
    id: string;
    title: string;
    element: CustomElement<EventsDictionary>;
}

export class TabsContainer extends CustomElement<Record<string, never>> {
    protected rootElem: HTMLElement;

    private tabs: Map<string, Tab<unknown>>;
    private tabHeaders: Map<string, HTMLElement>;

    constructor(tabs: Tab<unknown>[]) {
        super();

        this.tabs = new Map();
        for (const tab of tabs) {
            this.tabs.set(tab.id, tab);
        }
        this.tabHeaders = new Map();

        this.rootElem = this.createRoot();
    }

    private createRoot(): HTMLElement {
        const root = document.createElement('vscode-panels');

        for (const [id, tab] of this.tabs.entries()) {
            const tabElem = document.createElement('vscode-panel-tab');
            tabElem.id = `tab-${id}`;
            tabElem.textContent = tab.title;
            root.appendChild(tabElem);

            this.tabHeaders.set(id, tabElem);
        }
        for (const [id, tab] of this.tabs.entries()) {
            const view = document.createElement('vscode-panel-view');
            view.id = `view-${id}`;
            view.appendChild(tab.element.element);
            root.appendChild(view);
        }

        return root;
    }

    focusTab(id: string) {
        const tabHeader = this.tabHeaders.get(id);
        if (!tabHeader) {
            throw new Error('Invalid tab ID to focus!');
        }

        tabHeader.click();
    }

    render(): void {
        for (const tab of this.tabs.values()) {
            tab.element.render();
        }
    }
}
