import {reactive} from 'vue';

import {vscode} from '../vscode-wrapper';

export interface State {
    selectedTargetIndex: number;
}

export const DEFAULT_STATE = {
    selectedTargetIndex: 0
};

export let state = reactive<State>(DEFAULT_STATE);

export const setState = (newState: State) => {
    state = reactive(newState);
};

export const initializeState = () => {
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
            state = DEFAULT_STATE;
        }
    }

    setState(state);
};
