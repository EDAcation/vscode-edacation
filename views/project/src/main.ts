import {createApp} from 'vue';

import App from './App.vue';
import type {State} from './state';
import {DEFAULT_STATE} from './state';
import {vscode} from './vscode';

document.addEventListener('DOMContentLoaded', () => {
    let state = vscode.getState() as State;

    if (!state) {
        // Use initial data from VS Code extension
        // @ts-ignore
        state = window.initialData;

        if (state) {
            // Store initial state
            vscode.setState(state);
        } else {
            // Default state
            state = DEFAULT_STATE;
        }
    }

    // TODO: get state in app

    createApp(App).mount('#app');
});
