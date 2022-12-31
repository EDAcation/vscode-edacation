<script lang="ts">
import {
    provideVSCodeDesignSystem,
    vsCodeButton,
    vsCodeCheckbox,
    vsCodePanels,
    vsCodePanelTab,
    vsCodePanelView,
    vsCodeTextArea,
    vsCodeTextField
} from '@vscode/webview-ui-toolkit';

import EDAProject from './components/EDAProject.vue';
import {state} from './state';
import {vscode} from './vscode';

provideVSCodeDesignSystem().register(
    vsCodeButton(),
    vsCodeCheckbox(),
    vsCodePanels(),
    vsCodePanelTab(),
    vsCodePanelView(),
    vsCodeTextArea(),
    vsCodeTextField(),
);

export default {
    components: {
        EDAProject
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
        <EDAProject />
    </main>
</template>

<style scoped>

</style>
