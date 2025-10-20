<script lang="ts">
import type {ProjectTarget} from 'edacation';
import {defineComponent} from 'vue';

import {syncedState as projectState} from '../../project';
import {state as globalState} from '../state.js';

import EDATargetFlashing from './EDATargetFlashing.vue';
import EDATargetGeneral from './EDATargetGeneral.vue';
import EDATargetPlacementAndRouting from './EDATargetPlacementAndRouting.vue';
import EDATargetSynthesis from './EDATargetSynthesis.vue';
import EDATargetTesting from './EDATargetTesting.vue';

export default defineComponent({
    components: {
        EDATargetGeneral,
        EDATargetSynthesis,
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
        <h2 v-if="target">
            <span v-if="target.name">{{ target.name }}</span>
            <span v-else>&ZeroWidthSpace;</span>
        </h2>
        <h2 v-else>Defaults for all targets</h2>

        <vscode-tabs>
            <vscode-tab-header v-if="target" slot="header">General</vscode-tab-header>
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

            <vscode-tab-header slot="header">Flashing</vscode-tab-header>
            <vscode-tab-panel>
                <EDATargetFlashing :targetIndex="targetIndex" />
            </vscode-tab-panel>
        </vscode-tabs>
    </template>
</template>

<style scoped></style>
