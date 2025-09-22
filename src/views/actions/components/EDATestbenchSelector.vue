<script lang="ts">
import {VscodeSingleSelect} from '@vscode-elements/elements';
import {ProjectTarget} from 'edacation';
import {defineComponent} from 'vue';

import {syncedState as projectState} from '../../project';
import {state as globalState} from '../state';

export default defineComponent({
    data() {
        return {
            state: globalState,
            projectState
        };
    },
    computed: {
        targets(): ProjectTarget[] {
            return this.projectState.project?.getTargets() ?? [];
        },
        selectedTarget(): ProjectTarget | null {
            if (this.state.selectedTargetId === undefined) {
                return this.targets[0] ?? null;
            }
            return this.projectState.project?.getTarget(this.state.selectedTargetId) ?? null;
        },

        testbenchFiles(): string[] {
            if (!this.projectState.project) return [];

            return this.projectState.project
                .getInputFiles()
                .filter((file) => file.type === 'testbench')
                .map((file) => file.path);
        },
        selectedTestbench(): string | null {
            return this.selectedTarget?.config.iverilog?.options?.testbenchFile ?? null;
        }
    },
    methods: {
        handleTestbenchChange(event: Event) {
            if (!event.target) return;

            const target = event.target as VscodeSingleSelect;
            this.setTestbench(target.value);
        },
        setTestbench(file: string) {
            if (!this.selectedTarget) return;

            projectState.project?.setTestbenchPath(this.selectedTarget.id, file);
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
    <vscode-single-select
        :key="testbenchFiles"
        :value="selectedTestbench"
        style="width: initial"
        @change="handleTestbenchChange"
    >
        <vscode-option v-for="file in testbenchFiles" :value="file">
            {{ file }}
        </vscode-option>
    </vscode-single-select>
</template>

<style scoped></style>
