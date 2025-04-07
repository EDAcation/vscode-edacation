<script lang="ts">
import {VscodeSingleSelect} from '@vscode-elements/elements';
import {type TargetConfiguration} from 'edacation';
import {defineComponent} from 'vue';

import {state as globalState} from '../state';

export default defineComponent({
    props: {
        targetIndex: {
            type: Number
        }
    },
    data() {
        return {
            state: globalState
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
            return this.state.project?.configuration.targets ?? [];
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
