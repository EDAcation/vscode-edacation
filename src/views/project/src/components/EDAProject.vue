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
            console.log(
                'target index',
                this.state.selectedTargetIndex,
                this.state.selectedTargetIndex === 'all' ? undefined : parseInt(this.state.selectedTargetIndex)
            );
            return this.state.selectedTargetIndex === 'all' ? undefined : parseInt(this.state.selectedTargetIndex);
        }
    },
    data() {
        return {
            state: globalState
        };
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
        },
        handleTargetAdd() {
            if (!this.state.project) {
                return;
            }

            const index = this.state.project.configuration.targets.length + 1;
            this.state.project.configuration.targets.push({
                id: `target${index}`,
                name: `Target ${index}`,
                vendor: 'generic',
                family: 'generic',
                device: 'generic',
                package: 'generic'
            });
            // TODO: This does not work, because does not yet exist, due to sync issues
            // this.state.selectedTargetIndex = (index - 1).toString();
        },
        handleTargetDelete() {
            if (!this.state.project || this.targetIndex === undefined) {
                return;
            }

            this.state.project.configuration.targets.splice(this.targetIndex, 1);
            this.state.selectedTargetIndex = 'all';
        }
    }
});
</script>

<template>
    <template v-if="state.project">
        <h1>Project</h1>
        <vscode-text-field placeholder="Project name" :value="state.project.name" @input="handleNameChange">
            Project name
        </vscode-text-field>

        <h1>Targets</h1>
        <p>Select target to configure</p>
        <vscode-dropdown :value="state.selectedTargetIndex ?? 'all'" @input="handleTargetChange" style="width: 20rem">
            <vscode-option value="all">Defaults for all targets</vscode-option>
            <vscode-option v-for="(target, index) in state.project.configuration.targets" :key="index" :value="index">
                {{ target.name }}
            </vscode-option>
        </vscode-dropdown>

        <vscode-button v-if="targetIndex !== undefined" style="margin-start: 1rem" @click="handleTargetDelete">
            Delete target
        </vscode-button>

        <div>
            <vscode-button style="margin-top: 1rem" @click="handleTargetAdd">Add target</vscode-button>
        </div>

        <p v-if="state.project.configuration.targets.length === 0"><b>Error:</b> At least one target is required.</p>

        <vscode-divider style="margin-top: 1rem" />

        <EDATarget :targetIndex="targetIndex" />
    </template>
    <template v-else>
        <p>No project configuration available.</p>
    </template>
</template>

<style scoped></style>
