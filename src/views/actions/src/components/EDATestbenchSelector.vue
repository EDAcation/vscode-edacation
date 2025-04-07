<script lang="ts">
import {VscodeSingleSelect} from '@vscode-elements/elements';
import {Project, ProjectInputFile, type TargetConfiguration} from 'edacation';
import {defineComponent} from 'vue';

import * as vscode from '../../../vscode';
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
        handleTestbenchChange(event: Event) {
            if (!event.target) return;

            const target = event.target as VscodeSingleSelect;
            this.setTestbench(target.value);
        },
        setTestbench(file: string) {
            if (!this.target) return;

            vscode.vscode.postMessage({
                type: 'changeTestbench',
                testbenchPath: file,
                targetId: this.target.id
            });
        }
    },
    computed: {
        target(): TargetConfiguration | undefined {
            if (this.targetIndex === undefined) return undefined;
            const targets = this.state.project?.configuration.targets ?? [];
            return targets[this.targetIndex];
        },
        testbenchFiles(): string[] {
            if (!this.state.project) return [];

            const project = Project.deserialize(this.state.project);
            return project
                .getInputFiles()
                .filter((file) => file.type === 'testbench')
                .map((file) => file.path);
        },
        selectedTestbench(): string | null {
            let file = this.target?.iverilog?.options?.testbenchFile;
            if (!file) {
                file = this.testbenchFiles[0];
                if (!file) return null; // no testbenches
                this.setTestbench(file);
            }
            return file;
        }
    }
});
</script>

<template>
    <vscode-single-select @change="handleTestbenchChange" :value="selectedTestbench" style="width: initial">
        <vscode-option v-for="file in testbenchFiles" :value="file">
            {{ file }}
        </vscode-option>
    </vscode-single-select>
</template>

<style scoped></style>
