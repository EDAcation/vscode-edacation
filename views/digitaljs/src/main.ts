import 'jquery-ui';
import {yosys2digitaljs} from 'yosys2digitaljs';
// @ts-ignore: TODO: add module declaration (digitaljs.d.ts)
import {Circuit} from 'digitaljs';

import './main.css';
import {vscode} from './vscode';

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

    constructor(root: HTMLDivElement, state: State) {
        this.root = root;
        this.state = state;

        addEventListener('message', this.handleMessage.bind(this));
        addEventListener('messageerror', this.handleMessageError.bind(this));

        console.log('init');

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
        console.log('message', message);

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

    renderDocument() {
        console.log('rendering document', this.state);

        try {
            if (!this.state.document) {
                throw new Error('No document to render.');
            }


            // Parse JSON netlist
            const json = JSON.parse(this.state.document);

            // Convert it to DigitalJS format
            const digitalJs = yosys2digitaljs(json);

            console.log('digitaljs', digitalJs);

            // Initialize and display DigitalJS circuit
            const circuit = new Circuit(digitalJs);

            console.log('circuit', circuit);

            const element = document.createElement('div');
            element.style.width = `${this.root.getBoundingClientRect().width}`;
            element.style.height = `${this.root.getBoundingClientRect().height}`;
            this.root.replaceChildren(element);
            circuit.displayOn(element);

            console.log('done', circuit, this.root);
        } catch (err) {
            this.handleError(err);
        }
    }

    renderError(error: Error | string) {
        const element = document.createElement('code');
        element.textContent = typeof error === 'string' ? error : error.stack || error.message;
        this.root.replaceChildren(element);
    }
}

(() => {
    const root = document.querySelector<HTMLDivElement>('#app');

    let state = vscode.getState() as State;

    if (!state) {
        // Use initial data from VS Code extension
        // @ts-ignore
        state = window.initialData;

        // Default state
        if (!state) {
            state = {
                document: undefined
            };
        }
    }

    new View(root as HTMLDivElement, state);
})();
