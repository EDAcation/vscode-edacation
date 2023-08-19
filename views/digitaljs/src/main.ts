import '@vscode/codicons/dist/codicon.css';
import {allComponents} from '@vscode/webview-ui-toolkit/dist/toolkit.js';
import 'jquery-ui/dist/jquery-ui.min.js';

import './main.css';
import type {EditorMessage, ForeignViewMessage, ViewMessage} from './messages';
import * as viewers from './viewers';
import type {BaseViewer} from './viewers/base';
import {vscode} from './vscode';

// Force bundler to include VS Code Webview UI Toolkit
allComponents;

interface State {
    document?: string;
}

export class View {
    public readonly root: HTMLDivElement;

    private state: State;
    private viewer: BaseViewer | null;

    constructor(root: HTMLDivElement, state: State) {
        this.root = root;
        this.state = state;
        this.viewer = null;

        addEventListener('message', this.handleMessage.bind(this));
        addEventListener('messageerror', this.handleMessageError.bind(this));
        addEventListener('resize', this.handleResize.bind(this));

        if (this.state.document) {
            this.renderDocument();
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

    private handleMessage(message: MessageEvent<EditorMessage>) {
        switch (message.data.type) {
            case 'document': {
                this.updateState({
                    document: message.data.document
                });
                this.renderDocument();
                break;
            }
            case 'broadcast': {
                if (this.viewer) {
                    this.viewer.handleForeignViewMessage(message.data.message);
                }
            }
        }
    }

    private handleMessageError(message: MessageEvent) {
        this.handleError(`Message error\n\n${message}`);
    }

    private handleResize() {
        this.renderDocument();
    }

    private findViewer(): BaseViewer {
        if (!this.state.document) {
            throw new Error('No data to find viewer!');
        }

        const fileData = JSON.parse(this.state.document);
        const fileType = fileData['type'];
        const viewerData = fileData['data'];
        if (!fileType || !viewerData) {
            throw new Error('File is missing type or data keys.');
        }

        for (const viewer of Object.values(viewers)) {
            const viewerInst = new viewer(this, viewerData);
            if (viewerInst.getType() === fileType) {
                return viewerInst;
            }
        }

        throw new Error(`Could not find viewer for type: ${fileType}`);
    }

    private renderDocument() {
        try {
            if (!this.state.document) {
                throw new Error('No data to render document!');
            } else if (!this.viewer) {
                this.viewer = this.findViewer();
            }

            this.viewer.render().catch((err) => this.handleError(err, this.viewer));
        } catch (err) {
            this.handleError(err);
        }
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

    handleError(error: unknown, sourceViewer: BaseViewer | null = null) {
        if (error instanceof Error || typeof error === 'string') {
            this.renderError(error, sourceViewer);
        } else {
            this.renderError(new Error('Unknown error.'), sourceViewer);
        }
    }

    private renderError(error: Error | string, sourceViewer: BaseViewer | null) {
        const elementHeader = document.createElement('h3');
        elementHeader.textContent = 'Unable to open DigitalJS file';

        const elementCode = document.createElement('code');
        if (sourceViewer !== null) {
            elementCode.textContent = `*** Error in Viewer: ${sourceViewer.getType()} ***\n\n`;
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
