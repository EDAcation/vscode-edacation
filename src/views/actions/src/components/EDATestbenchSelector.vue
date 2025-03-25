<script lang="ts">
import {Dropdown} from '@vscode/webview-ui-toolkit';
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

            const target = event.target as Dropdown;

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
    <vscode-dropdown @change="handleTestbenchChange">
        <vscode-option v-for="(file, index) in testbenchFiles" :selected="file === selectedTestbench">
            {{ file }}
        </vscode-option>
    </vscode-dropdown>
</template>

<style scoped></style>
