<script lang="ts">
import type {TargetConfiguration} from 'edacation';
import {defineComponent} from 'vue';

import {state as globalState} from '../state';

import EDATargetGeneral from './EDATargetGeneral.vue';
import EDATargetNextpnr from './EDATargetNextpnr.vue';
import EDATargetYosys from './EDATargetYosys.vue';
import EDATargetSynthesis from './EDATargetSynthesis.vue';
import EDATargetPlacementAndRouting from './EDATargetPlacementAndRouting.vue'

export default defineComponent({
    components: {
        EDATargetGeneral,
        EDATargetYosys,
        EDATargetNextpnr,
        EDATargetSynthesis,
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

        <vscode-panels>
            <vscode-panel-tab id="tab-general" v-if="target">General</vscode-panel-tab>
            <vscode-panel-tab id="tab-synthesis">Synthesis</vscode-panel-tab>
            <vscode-panel-tab id="tab-pnr">Placement & Routing</vscode-panel-tab>
            <vscode-panel-tab id="tab-yosys">Yosys</vscode-panel-tab>
            <vscode-panel-tab id="tab-nextpnr">nextpnr</vscode-panel-tab>

            <vscode-panel-view id="tab-general" v-if="target">
                <EDATargetGeneral :targetIndex="targetIndex" />
            </vscode-panel-view>

            <vscode-panel-view id="view-synthesis">
                <EDATargetSynthesis :targetIndex="targetIndex" />
            </vscode-panel-view>

            <vscode-panel-view id="view-pnr">
                <EDATargetPlacementAndRouting :targetIndex="targetIndex" />
            </vscode-panel-view>

            <vscode-panel-view id="view-yosys">
                <EDATargetYosys :targetIndex="targetIndex" />
            </vscode-panel-view>

            <vscode-panel-view id="view-nextpnr">
                <EDATargetNextpnr :targetIndex="targetIndex" />
            </vscode-panel-view>
        </vscode-panels>
    </template>
</template>

<style scoped></style>
