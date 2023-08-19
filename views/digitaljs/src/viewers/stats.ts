import type {ForeignViewMessage} from '../messages';

import {BaseViewer} from './base';

export class StatsViewer extends BaseViewer {
    getType() {
        return 'stats';
    }

    handleForeignViewMessage(message: ForeignViewMessage): void {
        console.log('Foreign message:');
        console.log(message);
    }

    async render(): Promise<void> {
        this.root.replaceChildren();

        // TODO: make proper dropdowns etc
        const textElem = document.createElement('p');
        textElem.textContent = JSON.stringify(this.data);
        this.root.appendChild(textElem);

        const button = document.createElement('button');
        button.textContent = 'Click for broadcast';
        button.addEventListener('click', (_ev) => {
            this.broadcastMessage({
                type: 'moduleFocus',
                module: 'test_module_goes_here'
            });
        });
        this.root.appendChild(button);
    }
}
