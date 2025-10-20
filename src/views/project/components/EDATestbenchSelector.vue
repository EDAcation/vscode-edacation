<script lang="ts">
import {VscodeSingleSelect} from '@vscode-elements/elements';
import {ProjectTarget} from 'edacation';
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
        target(): ProjectTarget | undefined {
            if (this.targetIndex === undefined) return undefined;
            return this.projectState.project?.getTargets()[this.targetIndex];
        },
        testbenchFiles(): string[] {
            if (!this.projectState.project) return [];

            return this.projectState.project
                .getInputFiles()
                .filter((file) => file.type === 'testbench')
                .map((file) => file.path);
        },
        selectedTestbench(): string | null {
            return this.projectState.project?.getActiveTestbenchPath(this.target?.id ?? '') ?? null;
        }
    },
    methods: {
        handleTestbenchChange(event: Event) {
            if (!event.target) return;

            const target = event.target as VscodeSingleSelect;
            this.setTestbench(target.value);
        },
        setTestbench(file: string) {
            if (!this.target) return;

            projectState.project?.setActiveTestbenchPath(this.target.id, file);
        }
    }
});
</script>

<template>
    <!--
    Setting :key below forces everything to re-render when the testbench files change
    Otherwise, if the options change but the single-select element itself does not, it will show
    the wrong value
    -->
    <vscode-form-group v-if="testbenchFiles.length >= 2" :key="testbenchFiles" variant="vertical">
        <vscode-label>Testbench file</vscode-label>
        <vscode-single-select :value="selectedTestbench" @change="handleTestbenchChange">
            <vscode-option v-for="file in testbenchFiles" :value="file">
                {{ file }}
            </vscode-option>
        </vscode-single-select>
    </vscode-form-group>
</template>

<style scoped></style>
