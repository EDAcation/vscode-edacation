<script lang="ts">
import {defineComponent} from 'vue';

import * as vscode from '../../../vscode';
import {state as globalState} from '../state';

export default defineComponent({
    components: {},
    computed: {},
    data() {
        return {
            state: globalState
        };
    },
    methods: {
        executeCommand(command: string) {
            vscode.vscode.postMessage({
                type: 'command',
                command: `edacation.${command}`
            });
        },
    }
});
</script>

<template>
    <div style="flex-direction: row; align-items: stretch">
        <vscode-button style="margin: 0.5rem" @click="executeCommand('openProjectConfiguration')">
            Open Project Configuration
        </vscode-button>
        <vscode-button style="margin: 0.5rem" @click="executeCommand('runRTL')">Show RTL</vscode-button>
        <vscode-button style="margin: 0.5rem" @click="executeCommand('runYosys')">Synthesize using Yosys</vscode-button>
        <vscode-button style="margin: 0.5rem" @click="executeCommand('runNextpnr')">Place and Route using nextpnr</vscode-button>
    </div>
</template>

<style scoped></style>
