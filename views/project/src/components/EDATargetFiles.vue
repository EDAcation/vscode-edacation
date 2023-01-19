<script lang="ts">
import {defineComponent} from 'vue';

import {state} from '../state';
import type {TargetConfiguration} from '../state/configuration';
import {firstUpperCase} from '../util';

type WorkerId = 'yosys' | 'nextpnr';

export default defineComponent({
    props: {
        targetIndex: {
            type: Number
        },
        workerId: {
            type: String,
            required: true
        },
        workerName: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true
        }
    },
    computed: {
        typeName(): string {
            return firstUpperCase(this.type);
        },
        target(): TargetConfiguration | undefined {
            if (this.targetIndex === undefined) {
                return undefined;
            }
            return state.project!.configuration.targets[this.targetIndex];
        },
        // TODO: worker type (x.inputFiles, x.useGeneratedInputFiles, x.outputFiles, x.useGeneratedOutputFiles, etc.)
        worker(): {} {
            const worker = this.target ? this.target[this.workerId as WorkerId] : state.project!.configuration[this.workerId as WorkerId];
            if (worker) {
                return worker;
            }
            return {};
        },
    },
    data() {
        return {
            state
        }
    },
    methods: {
    }
});
</script>

<template>
    <template v-if="worker">
        <div>
            <h3>{{ workerName }} {{ type }} files</h3>
            <p>{{ typeName }} files are sent from the workspace folder to the {{ workerName }} worker.</p>
            <div>
                <vscode-checkbox>Use generated {{ type }} files</vscode-checkbox>
            </div>
            <div v-if="target">
                <vscode-checkbox>Use default {{ type }} files (from "All targets")</vscode-checkbox>
            </div>
            <div>
                <vscode-text-area rows="10" style="width: 100%; margin-top: 1rem;">{{ typeName }} files</vscode-text-area>
            </div>
        </div>
        <div>
            <h3>Combined {{ workerName }} {{ type }} files</h3>
            <code>TODO</code>
        </div>
    </template>
</template>
