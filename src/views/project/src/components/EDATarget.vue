<script lang="ts">
import type {TargetConfiguration} from 'edacation';
import {defineComponent} from 'vue';

import {state as globalState} from '../state';

import EDATargetGeneral from './EDATargetGeneral.vue';
import EDATargetNextpnr from './EDATargetNextpnr.vue';
import EDATargetPlacementAndRouting from './EDATargetPlacementAndRouting.vue';
import EDATargetSynthesis from './EDATargetSynthesis.vue';
import EDATargetTesting from './EDATargetTesting.vue';
import EDATargetYosys from './EDATargetYosys.vue';

export default defineComponent({
    components: {
        EDATargetGeneral,
        EDATargetYosys,
        EDATargetNextpnr,
        EDATargetSynthesis,
        EDATargetTesting,
        EDATargetPlacementAndRouting
    },
    props: {
        targetIndex: {
            type: Number
        }
    },
    computed: {
        target(): TargetConfiguration | undefined {
            if (this.targetIndex === undefined) {
                return undefined;
            }
            return this.state.project!.configuration.targets[this.targetIndex];
        }
    },
    data() {
        return {
            state: globalState
        };
    },
    methods: {}
});
</script>

<template>
    <template v-if="state.project">
        <h2 v-if="target">
            <span v-if="target.name">{{ target.name }}</span>
            <span v-else>&ZeroWidthSpace;</span>
        </h2>
        <h2 v-else>Defaults for all targets</h2>

        <vscode-tabs>
            <vscode-tab-header slot="header" v-if="target">General</vscode-tab-header>
            <vscode-tab-panel v-if="target">
                <EDATargetGeneral :targetIndex="targetIndex" />
            </vscode-tab-panel>

            <vscode-tab-header slot="header">Synthesis</vscode-tab-header>
            <vscode-tab-panel>
                <EDATargetSynthesis :targetIndex="targetIndex" />
            </vscode-tab-panel>

            <vscode-tab-header slot="header">Testing</vscode-tab-header>
            <vscode-tab-panel>
                <EDATargetTesting :targetIndex="targetIndex" />
            </vscode-tab-panel>

            <vscode-tab-header slot="header">Placement & Routing</vscode-tab-header>
            <vscode-tab-panel>
                <EDATargetPlacementAndRouting :targetIndex="targetIndex" />
            </vscode-tab-panel>

            <vscode-tab-header slot="header">Yosys</vscode-tab-header>
            <vscode-tab-panel>
                <EDATargetYosys :targetIndex="targetIndex" />
            </vscode-tab-panel>

            <vscode-tab-header slot="header">Nextpnr</vscode-tab-header>
            <vscode-tab-panel>
                <EDATargetNextpnr :targetIndex="targetIndex" />
            </vscode-tab-panel>
        </vscode-tabs>
    </template>
</template>

<style scoped></style>
