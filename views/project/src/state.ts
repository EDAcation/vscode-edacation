import {reactive, watch, type WatchStopHandle} from "vue";
import { vscode } from "./vscode";

export interface State {
    project?: Project;
}

export interface Project {
    name: string;
    inputFiles: string[];
    outputFiles: string[];
}

export const DEFAULT_STATE = {
    project: undefined
}

export let state = reactive<State>(DEFAULT_STATE);
let unwatch: WatchStopHandle | undefined;

export const setState = (newState: State) => {
    if (unwatch) {
        unwatch();
    }

    state = reactive(newState);

    unwatch = watch(state, (newState) => {
        const newDocument = `${JSON.stringify(newState.project, null, 4)}\n`;

        // TODO: debounce?

        vscode.setState(newState);

        vscode.postMessage({
            type: 'change',
            document: newDocument
        })
    });
};
