<script lang="ts">
import {VscodeSingleSelect} from '@vscode-elements/elements';
import {Project, ProjectInputFile, type TargetConfiguration} from 'edacation';
import {defineComponent} from 'vue';

import {state as globalState} from '../state';

export default defineComponent({
    props: {
        testbenchPath: {
            type: String
        }
    },
    data() {
        return {
            state: globalState
        };
    },
    methods: {
        handleTestbenchChange(event: Event) {
            if (!event.target) return;

            const target = event.target as VscodeSingleSelect;

            console.log(target);
        }
    },
    computed: {
        target(): TargetConfiguration | undefined {
            const targets = this.state.project?.configuration.targets ?? [];
            return targets[this.state.selectedTargetIndex];
        },
        testbenchFiles(): string[] {
            if (!this.state.project) return [];

            const project = Project.deserialize(this.state.project);
            return project
                .getInputFiles()
                .filter((file) => file.type === 'testbench')
                .map((file) => file.path);
        },
        selectedTestbench(): string | undefined {
            return this.target?.iverilog?.options?.testbenchFile;
        }
    }
});
</script>

<template>
    <vscode-single-select @change="handleTestbenchChange" style="width: initial">
        <vscode-option v-for="(file, index) in testbenchFiles" :selected="file === selectedTestbench">
            {{ file }}
        </vscode-option>
    </vscode-single-select>
</template>

<style scoped></style>
