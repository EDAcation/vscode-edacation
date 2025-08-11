<script lang="ts">
import '@vscode/codicons/dist/codicon.css';
import {Project, type TargetConfiguration} from 'edacation';
import {defineComponent} from 'vue';

import {syncedState as projectState} from '../../project';
import * as vscode from '../../vscode-wrapper';
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
            state: globalState,
            projectState
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
            return this.projectState.project?.getConfiguration().targets ?? [];
        },
        targetIndex(): number | undefined {
            if (this.targets.length === 0) return undefined;

            let selectedIndex = this.state.selectedTargetIndex ?? 0;
            if (selectedIndex < 0) return 0;
            if (selectedIndex >= this.targets.length) return this.targets.length - 1;
            return selectedIndex;
        },
        selectedTarget(): TargetConfiguration | null {
            if (this.targetIndex === undefined) return null;
            return this.targets[this.targetIndex] ?? null;
        },

        designFiles(): string[] {
            if (!this.projectState.project) return [];

            return this.projectState.project
                .getInputFiles()
                .filter((file) => file.type === 'design')
                .map((file) => file.path);
        },
        testbenchFiles(): string[] {
            if (!this.projectState.project) return [];

            return this.projectState.project
                .getInputFiles()
                .filter((file) => file.type === 'testbench')
                .map((file) => file.path);
        }
    }
});
</script>

<template>
    <component is="style" lang="css">
        .list { display: flex; align-items: stretch; gap: 0.75rem; }
        .list-vertical { flex-direction: column; }
        .list-horizontal { flex-direction: row; }
        
        vscode-button::part(base){ height: 100%; }
    </component>

    <div style="width: calc(100% - 40px)" class="list list-vertical">
        <div class="list list-horizontal">
            <vscode-button
                @click="executeCommand('openProjectConfiguration')"
                style="flex-grow: 1; display: flex; align-items: center"
            >
                <i class="codicon codicon-settings-gear" style="font-size: 1.5em; margin: 0"></i>
            </vscode-button>

            <div class="list list-vertical" v-if="targets.length !== 0" style="flex-grow: 2">
                <EDATargetSelector :targetIndex="targetIndex" v-if="targets.length > 1" />
                <EDATargetTLM :targetIndex="targetIndex" />
                <EDATestbenchSelector :targetIndex="targetIndex" v-if="testbenchFiles.length > 1" />
            </div>
        </div>

        <template v-if="targets.length > 0 && designFiles.length > 0">
            <vscode-button @click="executeTargetCommand('runRTL')">Show RTL (Yosys)</vscode-button>
            <vscode-button @click="executeTargetCommand('runIverilog')" v-if="testbenchFiles.length > 0"
                >Generate waveform (IVerilog)</vscode-button
            >
            <vscode-button @click="executeTargetCommand('runYosys')">Synthesize (Yosys)</vscode-button>
            <vscode-button @click="executeTargetCommand('runNextpnr')">Place and Route (Nextpnr)</vscode-button>
        </template>
    </div>
</template>

<style scoped></style>
