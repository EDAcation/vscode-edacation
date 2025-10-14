<script lang="ts">
import '@vscode/codicons/dist/codicon.css';
import {ProjectTarget} from 'edacation';
import {defineComponent} from 'vue';

import {syncedState as projectState} from '../../project';
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
            state: globalState,
            projectState
        };
    },
    computed: {
        targets(): ProjectTarget[] {
            return this.projectState.project?.getTargets() ?? [];
        }
    }
});
</script>

<template>
    <vscode-form-group v-if="targets.length > 0" variant="vertical" style="margin: 0">
        <template v-if="targets.length > 1">
            <vscode-label>Target</vscode-label>
            <EDATargetSelector />
        </template>

        <vscode-label>Top-level module <span class="normal">(verilog only)</span></vscode-label>
        <EDATargetTLM />
    </vscode-form-group>
    <div v-else style="margin-top: 1rem">
        <i>No targets found in the project.</i>
    </div>
</template>

<style scoped></style>
