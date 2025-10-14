<script lang="ts">
import {VscodeSingleSelect} from '@vscode-elements/elements';
import {ProjectTarget} from 'edacation';
import {defineComponent} from 'vue';

import {syncedState as projectState} from '../../project';
import {state as globalState} from '../state';

export default defineComponent({
    data() {
        return {
            state: globalState,
            projectState
        };
    },
    computed: {
        targets(): ProjectTarget[] {
            return this.projectState.project?.getTargets() ?? [];
        },
        selectedTarget(): ProjectTarget | null {
            return this.projectState.project?.getActiveTarget() ?? null;
        }
    },
    methods: {
        handleTargetChange(event: Event) {
            if (!event.target) return;

            const targetId = (event.target as VscodeSingleSelect).value;
            this.projectState.project?.setActiveTarget(targetId);
        }
    }
});
</script>

<template>
    <vscode-single-select style="width: initial" :value="selectedTarget?.id" @change="handleTargetChange">
        <vscode-option v-for="target in targets" :value="target.id">
            {{ target.name }}
        </vscode-option>
    </vscode-single-select>
</template>

<style scoped></style>
