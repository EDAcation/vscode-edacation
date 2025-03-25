<script lang="ts">
import '@vscode/codicons/dist/codicon.css';
import {Project, type TargetConfiguration} from 'edacation';
import {defineComponent} from 'vue';

import * as vscode from '../../../vscode';
import {state as globalState} from '../state';

import EDATargetSelector from './EDATargetSelector.vue';
import EDATargetTLM from './EDATargetTLM.vue';
import EDATestbenchSelector from './EDATestbenchSelector.vue';

export default defineComponent({
    components: {
        EDATargetSelector,
        EDATargetTLM,
        EDATestbenchSelector
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
        },

        testbenchFiles(): string[] {
            if (!this.state.project) return [];

            const project = Project.deserialize(this.state.project);
            return project
                .getInputFiles()
                .filter((file) => file.type === 'testbench')
                .map((file) => file.path);
        }
    }
});
</script>

<template>
    <component is="style" lang="css">
        .list { display: flex; align-items: stretch; gap: 0.75rem; } .list-vertical { flex-direction: column; }
        .list-horizontal { flex-direction: row; align-items: flex-end; }
    </component>

    <div style="width: calc(100% - 40px)" class="list list-vertical">
        <div class="list list-horizontal">
            <vscode-button
                @click="executeCommand('openProjectConfiguration')"
                style="flex-grow: 1; align-self: stretch"
            >
                <i class="codicon codicon-settings-gear" style="font-size: 1.5em"></i>
            </vscode-button>

            <div class="list list-vertical" v-if="targets.length !== 0" style="flex-grow: 2">
                <EDATargetTLM :targetIndex="state.selectedTargetIndex" />
                <EDATargetSelector v-if="targets.length > 1" />
                <EDATestbenchSelector v-if="testbenchFiles.length > 1" />
            </div>
        </div>

        <template v-if="targets.length !== 0">
            <vscode-divider></vscode-divider>
            <vscode-button @click="executeTargetCommand('runRTL')">Show RTL</vscode-button>
            <vscode-button @click="executeTargetCommand('runYosys')">Synthesize using Yosys</vscode-button>
            <vscode-button @click="executeTargetCommand('runNextpnr')">Place and Route using Nextpnr</vscode-button>
            <vscode-button @click="executeTargetCommand('runIverilog')" v-if="testbenchFiles.length > 1"
                >Generate waveform using IVerilog</vscode-button
            >
        </template>
    </div>
</template>

<style scoped></style>
