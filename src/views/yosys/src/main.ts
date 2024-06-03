import '@vscode/codicons/dist/codicon.css';
import {allComponents} from '@vscode/webview-ui-toolkit/dist/toolkit.js';
import 'jquery-ui/dist/jquery-ui.min.js';

import {vscode} from '../../vscode';

import {GlobalStoreConnector} from './globalStore';
import './main.css';
import type {EditorMessage, ForeignViewMessage, GlobalStoreMessage, ViewMessage} from './messages';
import type {YosysFile} from './types';
import {type BaseViewer, DiagramViewer, StatsViewer} from './viewers';

// Force bundler to include VS Code Webview UI Toolkit
allComponents;

interface State {
    document?: string;
}

export class View {
    public readonly root: HTMLDivElement;

    private state: State;
    private viewer: BaseViewer<YosysFile['data']> | null;
    private readonly globalStore: GlobalStoreConnector;

    constructor(root: HTMLDivElement, state: State) {
        this.root = root;
        this.state = state;
        this.viewer = null;

        this.globalStore = new GlobalStoreConnector();

        addEventListener('message', this.handleMessage.bind(this));
        addEventListener('messageerror', this.handleMessageError.bind(this));
        addEventListener('resize', this.handleResize.bind(this));

        if (this.state.document) {
            this.renderDocument(false);
        } else {
            this.sendMessage({
                type: 'ready'
            });
        }
    }

    private updateState(partialState: Partial<State>) {
        this.state = {
            ...this.state,
            ...partialState
        };
        vscode.setState(this.state);
    }

    private handleMessage(message: MessageEvent<EditorMessage | GlobalStoreMessage>) {
        switch (message.data.type) {
            case 'document': {
                this.updateState({
                    document: message.data.document
                });
                this.renderDocument(false);
                break;
            }
            case 'broadcast': {
                if (this.viewer) {
                    this.viewer.handleForeignViewMessage(message.data.message);
                }
                break;
            }
            case 'globalStore': {
                this.globalStore.onMessage(message.data);
            }
        }
    }

    private handleMessageError(message: MessageEvent) {
        this.handleError(`Message error\n\n${message}`);
    }

    private handleResize() {
        this.renderDocument(true);
    }

    private findViewer(): BaseViewer<YosysFile['data']> {
        if (!this.state.document) {
            throw new Error('No data to find viewer!');
        }

        const fileData = JSON.parse(this.state.document) as YosysFile;
        if (!fileData['type'] || !fileData['data']) {
            throw new Error('File is missing type or data keys.');
        }

        if (fileData['type'] === 'rtl' || fileData['type'] === 'luts') {
            return new DiagramViewer(this, fileData['data']);
        } else if (fileData['type'] === 'stats') {
            return new StatsViewer(this, fileData['data']);
        } else {
            throw new Error(`Could not find viewer for type: ${fileData['type']}`);
        }
    }

    private renderDocument(isUpdate: boolean) {
        try {
            if (!this.state.document) {
                throw new Error('No data to render document!');
            } else if (!this.viewer) {
                this.viewer = this.findViewer();
            }

            this.viewer.render(isUpdate).catch((err) => this.handleError(err, this.viewer));
        } catch (err) {
            this.handleError(err);
        }
    }

    storeValue(name: string, value: object): Promise<void> {
        return this.globalStore.set(name, value);
    }

    getValue(name: string): Promise<object> {
        return this.globalStore.get(name);
    }

    sendMessage(message: ViewMessage) {
        vscode.postMessage(message);
    }

    broadcastMessage(message: ForeignViewMessage) {
        vscode.postMessage({
            type: 'broadcast',
            message: message
        });
    }

    handleError(error: unknown, sourceViewer: BaseViewer<YosysFile['data']> | null = null) {
        if (error instanceof Error || typeof error === 'string') {
            this.renderError(error, sourceViewer);
        } else {
            this.renderError(new Error('Unknown error.'), sourceViewer);
        }
    }

    private renderError(error: Error | string, sourceViewer: BaseViewer<YosysFile['data']> | null) {
        const elementHeader = document.createElement('h3');
        elementHeader.textContent = 'Unable to open DigitalJS file';

        const elementCode = document.createElement('code');
        elementCode.style.whiteSpace = 'pre-wrap';
        if (sourceViewer !== null) {
            elementCode.textContent = `*** Error in Viewer: ${typeof sourceViewer} ***\n\n`;
        }
        elementCode.textContent += typeof error === 'string' ? error : error.stack || error.message;

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
