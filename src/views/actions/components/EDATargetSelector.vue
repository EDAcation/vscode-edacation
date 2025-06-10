<script lang="ts">
import {VscodeSingleSelect} from '@vscode-elements/elements';
import {type TargetConfiguration} from 'edacation';
import {defineComponent} from 'vue';

import {syncedState as projectState} from '../../project';
import {state as globalState} from '../state';

export default defineComponent({
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
    methods: {
        handleTargetChange(event: Event) {
            if (!event.target) return;

            this.state.selectedTargetIndex = (event.target as VscodeSingleSelect).selectedIndex;
        }
    },
    computed: {
        targets(): TargetConfiguration[] {
            return this.projectState.project?.getConfiguration().targets ?? [];
        }
    }
});
</script>

<template>
    <vscode-single-select @change="handleTargetChange" style="width: initial">
        <vscode-option v-for="(target, index) in targets" :selected="index === targetIndex">
            {{ target.name }}
        </vscode-option>
    </vscode-single-select>
</template>

<style scoped></style>
