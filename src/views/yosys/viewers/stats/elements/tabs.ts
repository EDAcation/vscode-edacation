import type {VscodeTabHeader} from '@vscode-elements/elements';

import {CustomElement} from './base';

interface Tab<EventsDictionary> {
    id: string;
    title: string;
    element: CustomElement<EventsDictionary>;
}

export class TabsContainer extends CustomElement<Record<string, never>> {
    protected rootElem: HTMLElement;

    private tabs: Map<string, Tab<unknown>>;
    private tabHeaders: Map<string, VscodeTabHeader>;

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
        const root = document.createElement('vscode-tabs');

        for (const [id, tab] of this.tabs.entries()) {
            const header = document.createElement('vscode-tab-header');
            header.slot = 'header';
            header.textContent = tab.title;
            root.appendChild(header);

            const panel = document.createElement('vscode-tab-panel');
            panel.style.height = '100%';
            panel.appendChild(tab.element.element);
            root.appendChild(panel);

            this.tabHeaders.set(id, header);
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
