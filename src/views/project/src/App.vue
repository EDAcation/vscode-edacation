<script lang="ts">
import {
    provideVSCodeDesignSystem,
    vsCodeButton,
    vsCodeCheckbox,
    vsCodeDivider,
    vsCodeDropdown,
    vsCodeOption,
    vsCodePanelTab,
    vsCodePanelView,
    vsCodePanels,
    vsCodeTextArea,
    vsCodeTextField
} from '@vscode/webview-ui-toolkit';

import {vscode} from '../../vscode';

import EDAProject from './components/EDAProject.vue';
import {state} from './state';

provideVSCodeDesignSystem().register(
    vsCodeButton(),
    vsCodeCheckbox(),
    vsCodeDivider(),
    vsCodeDropdown(),
    vsCodeOption(),
    vsCodePanels(),
    vsCodePanelTab(),
    vsCodePanelView(),
    vsCodeTextArea(),
    vsCodeTextField()
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

<style scoped></style>
