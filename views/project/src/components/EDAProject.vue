<script lang="ts">
import {defineComponent} from 'vue';

import {state} from '../state';

export default defineComponent({
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
    <h1>Configuration</h1>

    <div v-if="state.project">
        <vscode-text-field placeholder="Project name" :value="state.project.name" @input="handleNameChange">Project name</vscode-text-field>
    </div>
    <div v-else>
        <p>No project configuration available.</p>
    </div>

    <!-- <div>
        <code>{{ state.project }}</code>
    </div> -->
</template>

<style scoped>

</style>
