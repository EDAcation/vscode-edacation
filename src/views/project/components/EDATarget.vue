<script lang="ts">
import type {ProjectTarget} from 'edacation';
import {defineComponent} from 'vue';

import {syncedState as projectState} from '../../project';
import {state as globalState} from '../state.js';

import EDATargetFlashing from './EDATargetFlashing.vue';
import EDATargetGeneral from './EDATargetGeneral.vue';
import EDATargetPlacementAndRouting from './EDATargetPlacementAndRouting.vue';
import EDATargetRTLSynthesis from './EDATargetRTLSynthesis.vue';
import EDATargetTesting from './EDATargetTesting.vue';

export default defineComponent({
    components: {
        EDATargetGeneral,
        EDATargetRTLSynthesis,
        EDATargetTesting,
        EDATargetPlacementAndRouting,
        EDATargetFlashing
    },
    props: {
        targetIndex: {
            type: Number
        }
    },
    data() {
        return {
            state: globalState,
            projectState
        };
    },
    computed: {
        target(): ProjectTarget | undefined {
            if (this.targetIndex === undefined) {
                return undefined;
            }
            return this.projectState.project?.getTargets()[this.targetIndex];
        }
    },
    methods: {}
});
</script>

<template>
    <template v-if="projectState.project">
        <vscode-tabs>
            <vscode-tab-header v-if="target" slot="header">General</vscode-tab-header>
            <vscode-tab-panel v-if="target">
                <EDATargetGeneral :targetIndex="targetIndex" />
            </vscode-tab-panel>

            <vscode-tab-header slot="header">Synthesis & RTL</vscode-tab-header>
            <vscode-tab-panel>
                <EDATargetRTLSynthesis :targetIndex="targetIndex" />
            </vscode-tab-panel>

            <vscode-tab-header slot="header">Testing</vscode-tab-header>
            <vscode-tab-panel>
                <EDATargetTesting :targetIndex="targetIndex" />
            </vscode-tab-panel>

            <vscode-tab-header slot="header">Placement & Routing</vscode-tab-header>
            <vscode-tab-panel>
                <EDATargetPlacementAndRouting :targetIndex="targetIndex" />
            </vscode-tab-panel>

            <vscode-tab-header slot="header">Flashing</vscode-tab-header>
            <vscode-tab-panel>
                <EDATargetFlashing :targetIndex="targetIndex" />
            </vscode-tab-panel>
        </vscode-tabs>
    </template>
</template>

<style scoped></style>
