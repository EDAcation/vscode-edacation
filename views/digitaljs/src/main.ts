import '@vscode/codicons/dist/codicon.css';
import {allComponents} from '@vscode/webview-ui-toolkit/dist/toolkit.js';
// @ts-expect-error: TODO: add module declaration (digitaljs.d.ts)
import {Circuit} from 'digitaljs';
import 'jquery-ui/dist/jquery-ui.min.js';
import {yosys2digitaljs} from 'yosys2digitaljs';

import './main.css';
import {vscode} from './vscode';

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

const getSvg = (svgElem: Element, width: number, height: number): string => {
    // Filter conveniently labeled foreign objects from element
    let foreignElems = svgElem.getElementsByTagName('foreignObject');
    for (let elem of Array.from(foreignElems)) {
        elem.remove();
    }

    // Set correct XML namespace
    svgElem.removeAttribute('xmlns:xlink');
    svgElem.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // Correctly specify width / height to prevent clipping
    svgElem.setAttribute('width', `${width}px`);
    svgElem.setAttribute('height', `${height}px`);

    // Add XML header
    return '<?xml version="1.0" encoding="utf-8"?>\n' + svgElem.outerHTML;
}

class View {
    private readonly root: HTMLDivElement;
    private state: State;

    constructor(root: HTMLDivElement, state: State) {
        this.root = root;
        this.state = state;

        addEventListener('message', this.handleMessage.bind(this));
        addEventListener('messageerror', this.handleMessageError.bind(this));
        addEventListener('resize', this.handleResize.bind(this));

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

    handleResize() {
        this.renderDocument();
    }

    requestExport() {
        // Find our SVG root element
        let svgElems = document.getElementsByTagName('svg');
        if (!svgElems) {
            throw new Error('Could not find SVG element to export');
        }
        let svgElem = svgElems[0];

        // Extract viewable SVG data from elem
        let svgData = getSvg(
            svgElem.cloneNode(true) as Element,  // Deep clone so we don't affect the SVG in the DOM
            svgElem.clientWidth,
            svgElem.clientHeight
        );

        // Send save request to main worker
        vscode.postMessage({
            'type': 'requestSave',
            'data': {
                'fileContents': svgData,
                'defaultPath': 'export.svg',
                'saveFilters': {'svg': ['.svg']}
            }
        });
    }

    renderDocument() {
        try {
            if (!this.state.document) {
                throw new Error('No document to render.');
            }

            // Parse Yosys netlist from JSON string
            const json = JSON.parse(this.state.document);

            // Convert from Yosys netlist to DigitalJS format
            const digitalJs = yosys2digitaljs(json);

            // Initialize circuit
            const circuit = new Circuit(digitalJs);

            // Clear
            this.root.replaceChildren();

            // Render actions
            const elementActions = document.createElement('div');
            elementActions.style.marginBottom = '1rem';
            elementActions.innerHTML = /*html*/ `
                <vscode-button id="digitaljs-start">
                    Start
                    <span slot="start" class="codicon codicon-debug-start" />
                </vscode-button>
                <vscode-button id="digitaljs-stop" disabled>
                    Stop
                    <span slot="start" class="codicon codicon-debug-stop" />
                </vscode-button>
                <vscode-button id="digitaljs-export">
                    Export to SVG
                    <span slot="start" class="codicon codicon-save" />
                </vscode-button>
            `;
            this.root.appendChild(elementActions);

            const buttonStart = document.getElementById('digitaljs-start');
            const buttonStop = document.getElementById('digitaljs-stop');
            const buttonExport = document.getElementById('digitaljs-export');

            buttonStart?.addEventListener('click', () => circuit.start());
            buttonStop?.addEventListener('click', () => circuit.stop());
            buttonExport?.addEventListener('click', this.requestExport);

            circuit.on('changeRunning', () => {
                if (circuit.running) {
                    buttonStart?.setAttribute('disabled', '');
                    buttonStop?.removeAttribute('disabled');
                } else {
                    buttonStart?.removeAttribute('disabled');
                    buttonStop?.setAttribute('disabled', '');
                }
            });

            // Render circuit
            const elementCircuit = document.createElement('div');
            circuit.displayOn(elementCircuit);
            this.root.appendChild(elementCircuit);
        } catch (err) {
            this.handleError(err);
        }
    }

    renderError(error: Error | string) {
        const elementHeader = document.createElement('h3');
        elementHeader.textContent = 'Unable to render DigitalJS file';

        const elementCode = document.createElement('code');
        elementCode.textContent = typeof error === 'string' ? error : error.stack || error.message;

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
