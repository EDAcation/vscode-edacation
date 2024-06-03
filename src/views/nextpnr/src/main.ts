import '@vscode/codicons/dist/codicon.css';
import {allComponents} from '@vscode/webview-ui-toolkit/dist/toolkit.js';
import {getElementGroups} from 'edacation';
import nextpnrViewer from 'nextpnr-viewer';

import {vscode} from '../../vscode';

import './main.css';

// Force bundler to include VS Code Webview UI Toolkit
allComponents;

interface State {
    document?: string;
}

interface MessageDocument {
    type: 'document';
    document: string;
}

type Message = MessageDocument;

class View {
    private readonly root: HTMLDivElement;
    private state: State;

    private viewer?: ReturnType<typeof nextpnrViewer>;

    private cellColors: Record<string, string> = {};

    constructor(root: HTMLDivElement, state: State) {
        this.root = root;
        this.state = state;

        addEventListener('message', this.handleMessage.bind(this));
        addEventListener('messageerror', this.handleMessageError.bind(this));
        addEventListener('resize', this.handleResize.bind(this));

        // Populate cell colors from EDAcation library
        for (const elemGroup of getElementGroups().values()) {
            for (const elem of elemGroup.elements) {
                this.cellColors[elem] = elemGroup.color;
            }
        }

        if (this.state.document) {
            this.renderDocument();
        } else {
            vscode.postMessage({
                type: 'ready'
            });
        }
    }

    updateState(partialState: Partial<State>) {
        this.state = {
            ...this.state,
            ...partialState
        };
        vscode.setState(this.state);
    }

    handleMessage(message: MessageEvent<Message>) {
        switch (message.data.type) {
            case 'document': {
                this.updateState({
                    document: message.data.document
                });
                this.renderDocument();
            }
        }
    }

    handleMessageError(message: MessageEvent) {
        console.error(message);
        this.handleError(new Error('Message error.'));
    }

    handleError(error: unknown) {
        if (error instanceof Error || typeof error === 'string') {
            this.renderError(error);
        } else {
            this.renderError(new Error('Unknown error.'));
        }
    }

    private getSize(): [number, number] {
        // Obtain available space
        const rect = document.body.getBoundingClientRect();

        // NOTE: subtract default VS Code padding
        return [rect.width - 40, rect.height];
    }

    handleResize() {
        if (this.viewer) {
            this.viewer.resize(...this.getSize());
        }
    }

    renderDocument() {
        try {
            if (!this.state.document) {
                throw new Error('No document to render.');
            }

            // Parse nextpnr document from JSON string
            const json = JSON.parse(this.state.document);

            if (!this.viewer) {
                // Clear root
                this.root.replaceChildren();

                // Obtain available space
                const [width, height] = this.getSize();

                // Render viewer
                const elementViewer = document.createElement('div');
                this.root.appendChild(elementViewer);
                this.viewer = nextpnrViewer(elementViewer, {
                    width,
                    height,
                    cellColors: this.cellColors
                });
            }

            // Render nextpnr document
            this.viewer.showJson(json);
        } catch (err) {
            this.handleError(err);
        }
    }

    renderError(error: Error | string) {
        const elementHeader = document.createElement('h3');
        elementHeader.textContent = 'Unable to render nextpnr file';

        const elementCode = document.createElement('code');
        elementCode.style.whiteSpace = 'pre-wrap';
        elementCode.textContent = typeof error === 'string' ? error : error.stack || error.message;

        this.viewer = undefined;
        this.root.replaceChildren();
        this.root.appendChild(elementHeader);
        this.root.appendChild(elementCode);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const root = document.querySelector<HTMLDivElement>('#app');

    let state = vscode.getState() as State;

    if (!state) {
        // Use initial data from VS Code extension
        // @ts-expect-error: initialData does not exist on window
        state = window.initialData;

        if (state) {
            // Store initial state
            vscode.setState(state);
        } else {
            // Default state
            state = {
                document: undefined
            };
        }
    }

    new View(root as HTMLDivElement, state);
});
