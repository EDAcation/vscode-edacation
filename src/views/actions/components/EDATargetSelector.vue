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
        targetId(): string | undefined {
            return this.state.selectedTargetId;
        },
        targets(): ProjectTarget[] {
            return this.projectState.project?.getTargets() ?? [];
        },
        selectedTarget(): ProjectTarget | null {
            if (this.targetId === undefined) {
                return this.targets[0] ?? null;
            }
            return this.projectState.project?.getTarget(this.targetId) ?? null;
        }
    },
    methods: {
        handleTargetChange(event: Event) {
            if (!event.target) return;

            this.state.selectedTargetId = (event.target as VscodeSingleSelect).value;
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
