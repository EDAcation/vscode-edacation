import type {ProjectState} from 'edacation';
import {type WatchStopHandle, nextTick, reactive, watch} from 'vue';

import {vscode} from '../../vscode-wrapper';

export interface State {
    project?: ProjectState;
    selectedTargetIndex?: number;
    selectedTargetTabId: string;
}

export const DEFAULT_STATE = {
    project: undefined,
    selectedTargetIndex: undefined,
    selectedTargetTabId: 'tab-device'
};

export let state = reactive<State>(DEFAULT_STATE);
let unwatch: WatchStopHandle | undefined;

let doIgnoreSave = false;

export const setState = (newState: State) => {
    if (unwatch) {
        unwatch();
    }

    state = reactive(newState);

    unwatch = watch(state, () => {
        // TODO: debounce?

        if (doIgnoreSave) return;

        vscode.setState(state);

        const newDocument = `${JSON.stringify(state.project, null, 4)}\n`;

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

export const ignoreSave = (callback: () => void): void => {
    doIgnoreSave = true;
    callback();
    void nextTick(() => {
        doIgnoreSave = false;
    });
};
