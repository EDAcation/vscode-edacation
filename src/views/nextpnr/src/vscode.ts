import type {WebviewApi} from 'vscode-webview';

class VSCodeWrapper {
    private readonly api: WebviewApi<unknown> | undefined;

    constructor() {
        if (typeof acquireVsCodeApi === 'function') {
            this.api = acquireVsCodeApi();
        }
    }

    public postMessage(message: unknown) {
        if (this.api) {
            this.api.postMessage(message);
        } else {
            console.log(message);
        }
    }

    public getState(): unknown | undefined {
        if (this.api) {
            return this.api.getState();
        } else {
            const state = localStorage.getItem('vscodeState');
            return state ? JSON.parse(state) : undefined;
        }
    }

    public setState<T extends unknown | undefined>(newState: T): T {
        if (this.api) {
            return this.api.setState(newState);
        } else {
            localStorage.setItem('vscodeState', JSON.stringify(newState));
            return newState;
        }
    }
}

export const vscode = new VSCodeWrapper();
