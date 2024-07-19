<script lang="ts">
import {defineComponent} from 'vue';

import * as vscode from '../../../vscode';
import {state as globalState} from '../state';
import EDATargetSelector from './EDATargetSelector.vue';
import type { TargetConfiguration } from 'edacation';

export default defineComponent({
    components: {
        EDATargetSelector
    },
    data() {
        return {
            state: globalState
        };
    },
    methods: {
        executeCommand(command: string) {
            console.log(this.selectedTarget);

            vscode.vscode.postMessage({
                type: 'command',
                command: `edacation.${command}`
            });
        },
    },
    computed: {
        targets(): TargetConfiguration[] {
            return this.state.project?.configuration.targets ?? [];
        },

        selectedTarget(): TargetConfiguration | null {
            return this.targets[this.state.selectedTargetIndex] ?? null;
        },
    }
});
</script>

<template>
    <div style="display: flex; flex-direction: column; align-items: stretch; gap: 0.75rem; margin: 0.5rem">
        <vscode-button @click="executeCommand('openProjectConfiguration')">
            Open Project Configuration
        </vscode-button>
        <vscode-divider></vscode-divider>
        <EDATargetSelector v-if="targets.length > 1"/>
        <vscode-button @click="executeCommand('runRTL')">Show RTL</vscode-button>
        <vscode-button @click="executeCommand('runYosys')">Synthesize using Yosys</vscode-button>
        <vscode-button @click="executeCommand('runNextpnr')">Place and Route using nextpnr</vscode-button>
    </div>
</template>

<style scoped></style>
