<script lang="ts">
import {defineComponent} from 'vue';

import {state} from '../state';
import EDATarget from './EDATarget.vue';

export default defineComponent({
    components: {
        EDATarget
    },
    data() {
        return {
            state
        }
    },
    methods: {
        handleNameChange(event: Event) {
            if (!this.state.project || !event.target) {
                return;
            }

            this.state.project.name = (event.target as HTMLInputElement).value;
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
        <vscode-dropdown style="width: 20rem;">
            <vscode-option>All targets</vscode-option>
            <vscode-option v-for="(target, index) in state.project.configuration.targets" :key="index">
                {{ target.name }}
            </vscode-option>
        </vscode-dropdown>

        <vscode-button style="margin-start: 1rem;">Add target</vscode-button>

        <p v-if="state.project.configuration.targets.length === 0"><b>Error:</b> At least one target is required.</p>

        <!-- <h2>Default target</h2>
        <p>This configuration applies to all targets, unless a target opts out of using it.</p> -->

        <vscode-divider style="margin-top: 1rem;" />

        <EDATarget :targetIndex="0" />
    </template>
    <template v-else>
        <p>No project configuration available.</p>
    </template>
</template>

<style scoped>

</style>
