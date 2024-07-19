<script lang="ts">
import {defineComponent} from 'vue';
import {type TargetConfiguration} from 'edacation';
import { Dropdown } from '@vscode/webview-ui-toolkit';

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

            this.state.selectedTargetIndex = (event.target as Dropdown).selectedIndex;
            console.log(this.state.selectedTargetIndex);
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
    <vscode-dropdown @change="handleTargetChange">
        <vscode-option v-for="(target, index) in targets" :selected="index === state.selectedTargetIndex">
            {{ target.name }}
        </vscode-option>
    </vscode-dropdown>
</template>

<style scoped></style>
