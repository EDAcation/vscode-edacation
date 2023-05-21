<script lang="ts">
import {defineComponent} from 'vue';

import {state as globalState} from '../state';
import EDATarget from './EDATarget.vue';

export default defineComponent({
    components: {
        EDATarget
    },
    computed: {
        targetIndex(): number | undefined {
            console.log('target index', this.state.selectedTargetIndex, this.state.selectedTargetIndex === 'all' ? undefined : parseInt(this.state.selectedTargetIndex));
            return this.state.selectedTargetIndex === 'all' ? undefined : parseInt(this.state.selectedTargetIndex);
        }
    },
    data() {
        return {
            state: globalState
        }
    },
    methods: {
        handleNameChange(event: Event) {
            if (!this.state.project || !event.target) {
                return;
            }

            this.state.project.name = (event.target as HTMLInputElement).value;
        },
        handleTargetChange(event: Event) {
            if (!event.target) {
                return;
            }

            this.state.selectedTargetIndex = (event.target as HTMLSelectElement).value;
        }
    }
});

</script>

<template>
    <template v-if="state.project">
        <h1>Project</h1>
        <vscode-text-field placeholder="Project name" :value="state.project.name" @input="handleNameChange">Project name</vscode-text-field>

        <h1>Targets</h1>
        <p>Select target to configure</p>
        <vscode-dropdown :value="state.selectedTargetIndex ?? 'all'" @input="handleTargetChange" style="width: 20rem;">
            <vscode-option value="all">Defaults for all targets</vscode-option>
            <vscode-option v-for="(target, index) in state.project.configuration.targets" :key="index" :value="index">
                {{ target.name }}
            </vscode-option>
        </vscode-dropdown>

        <vscode-button style="margin-start: 1rem;">Add target</vscode-button>

        <p v-if="state.project.configuration.targets.length === 0"><b>Error:</b> At least one target is required.</p>

        <vscode-divider style="margin-top: 1rem;" />

        <EDATarget :targetIndex="targetIndex" />
    </template>
    <template v-else>
        <p>No project configuration available.</p>
    </template>
</template>

<style scoped>

</style>
