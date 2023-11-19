<script lang="ts">
import {provideVSCodeDesignSystem, vsCodeButton, vsCodeDropdown, vsCodeOption} from '@vscode/webview-ui-toolkit';

import EDAPlaceholder from './components/EDAPlaceholder.vue';
import {state} from './state';
import {vscode} from './vscode';

provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeDropdown(), vsCodeOption());

export default {
    components: {
        EDAPlaceholder
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
        <EDAPlaceholder />
    </main>
</template>

<style scoped></style>
