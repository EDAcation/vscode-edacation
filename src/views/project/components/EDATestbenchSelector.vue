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
            projectState,
            textfieldId: `textfield-${Math.random().toString(36).slice(2, 10)}`
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
    <vscode-form-group :key="testbenchFiles" variant="horizontal">
        <vscode-label :for="textfieldId">Selected testbench file</vscode-label>
        <vscode-form-group variant="vertical" class="target-form-vertical">
            <vscode-single-select
                :value="selectedTestbench"
                :disabled="testbenchFiles.length < 2"
                @change="handleTestbenchChange"
            >
                <vscode-option v-for="file in testbenchFiles" :value="file">
                    {{ file }}
                </vscode-option>
            </vscode-single-select>
            <vscode-form-helper>
                <p>
                    Testbench file to use for waveform generation. This option is only available if at least two input
                    files are marked as testbenches in the project configuration.
                </p>
            </vscode-form-helper>
        </vscode-form-group>
    </vscode-form-group>
</template>

<style>
.target-form-vertical {
    margin-top: 0;
    margin-bottom: 0;
    min-width: 0;
    flex: 1;
}
</style>
