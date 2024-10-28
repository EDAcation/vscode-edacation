<script lang="ts">
import {
    provideVSCodeDesignSystem,
    vsCodeButton,
    vsCodeDivider,
    vsCodeDropdown,
    vsCodeOption,
    vsCodeTextField
} from '@vscode/webview-ui-toolkit';

import {vscode} from '../../vscode';

import EDAProjectActions from './components/EDAProjectActions.vue';
import {state} from './state';

provideVSCodeDesignSystem().register(
    vsCodeButton(),
    vsCodeDropdown(),
    vsCodeOption(),
    vsCodeDivider(),
    vsCodeTextField()
);

export default {
    components: {
        EDAProjectActions
    },
    data() {
        return {
            state
        };
    },
    mounted() {
        window.addEventListener('message', this.message);
        vscode.postMessage({
            type: 'ready'
        });
    },
    unmounted() {
        window.removeEventListener('message', this.message);
    },
    methods: {
        message(event: MessageEvent) {
            console.log('message', event.data);

            switch (event.data.type) {
                case 'project':
                    this.state.project = event.data.project;
                    break;
            }
        }
    }
};
</script>

<template>
    <main>
        <EDAProjectActions />
    </main>
</template>

<style scoped></style>
