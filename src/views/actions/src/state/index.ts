import type {ProjectState} from 'edacation';
import {type WatchStopHandle, reactive, watch} from 'vue';

import {vscode} from '../../../vscode';

export interface State {
    project?: ProjectState;
    selectedTargetIndex: number;
}

export const DEFAULT_STATE = {
    project: undefined,
    selectedTargetIndex: 0
};

export let state = reactive<State>(DEFAULT_STATE);
let unwatch: WatchStopHandle | undefined;

export const setState = (newState: State) => {
    if (unwatch) {
        unwatch();
    }

    state = reactive(newState);

    unwatch = watch(state, (newState) => {
        // TODO: debounce?

        vscode.setState(newState);

        const newDocument = `${JSON.stringify(newState.project, null, 4)}\n`;

        vscode.postMessage({
            type: 'change',
            document: newDocument
        });
    });
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
