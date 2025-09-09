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
    computed: {
        targets(): TargetConfiguration[] {
            return this.projectState.project?.getConfiguration().targets ?? [];
        }
    },
    methods: {
        handleTargetChange(event: Event) {
            if (!event.target) return;

            this.state.selectedTargetIndex = (event.target as VscodeSingleSelect).selectedIndex;
        }
    }
});
</script>

<template>
    <vscode-single-select style="width: initial" @change="handleTargetChange">
        <vscode-option v-for="(target, index) in targets" :selected="index === targetIndex">
            {{ target.name }}
        </vscode-option>
    </vscode-single-select>
</template>

<style scoped></style>
