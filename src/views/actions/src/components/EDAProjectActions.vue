<script lang="ts">
import type {TargetConfiguration} from 'edacation';
import {defineComponent} from 'vue';

import * as vscode from '../../../vscode';
import {state as globalState} from '../state';

import EDATargetSelector from './EDATargetSelector.vue';
import EDATargetTLM from './EDATargetTLM.vue';

export default defineComponent({
    components: {
        EDATargetSelector,
        EDATargetTLM
    },
    data() {
        return {
            state: globalState
        };
    },
    methods: {
        executeCommand(command: string, ...args: unknown[]) {
            console.log(this.selectedTarget);

            vscode.vscode.postMessage({
                type: 'command',
                command: `edacation.${command}`,
                args: args
            });
        },

        executeTargetCommand(command: string) {
            if (!this.selectedTarget) {
                return this.executeCommand(command);
            }
            return this.executeCommand(command, this.selectedTarget.id);
        }
    },
    computed: {
        targets(): TargetConfiguration[] {
            return this.state.project?.configuration.targets ?? [];
        },

        selectedTarget(): TargetConfiguration | null {
            return this.targets[this.state.selectedTargetIndex] ?? null;
        }
    }
});
</script>

<template>
    <div style="display: flex; flex-direction: column; align-items: stretch; gap: 0.75rem; margin: 0.5rem">
        <vscode-button @click="executeCommand('openProjectConfiguration')"> Open Project Configuration </vscode-button>

        <template v-if="targets.length !== 0">
            <vscode-divider></vscode-divider>
            <EDATargetSelector v-if="targets.length > 1" />
            <EDATargetTLM :targetIndex="state.selectedTargetIndex" />

            <vscode-button @click="executeTargetCommand('runRTL')">Show RTL</vscode-button>
            <vscode-button @click="executeTargetCommand('runYosys')">Synthesize using Yosys</vscode-button>
            <vscode-button @click="executeTargetCommand('runNextpnr')">Place and Route using nextpnr</vscode-button>
        </template>
    </div>
</template>

<style scoped></style>
