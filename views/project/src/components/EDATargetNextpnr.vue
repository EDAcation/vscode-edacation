<script lang="ts">
import {defineComponent} from 'vue';

import {state} from '../state';
import type {TargetConfiguration, NextpnrConfiguration} from '../state/configuration';
import EDATargetFiles from './EDATargetFiles.vue';

export default defineComponent({
    components: {
        EDATargetFiles
    },
    props: {
        targetIndex: {
            type: Number
        }
    },
    computed: {
        target(): TargetConfiguration | undefined {
            if (this.targetIndex === undefined) {
                return undefined;
            }
            return state.project!.configuration.targets[this.targetIndex];
        },
        nextpnr(): NextpnrConfiguration | undefined {
            const nextpnr = this.target ? this.target.nextpnr : state.project!.configuration.nextpnr;
            if (nextpnr) {
                return nextpnr;
            }
            return {
                useGeneratedArguments: true,
                arguments: []
            };
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
    <template v-if="nextpnr">
        <div style="width: 100%; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
            <div>
                <h3>nextpnr arguments</h3>
                <p>Arguments are passed to the nextpnr worker for excecution.</p>
                <div>
                    <vscode-checkbox :value="nextpnr.useGeneratedArguments">Use generated arguments</vscode-checkbox>
                </div>
                <div v-if="target">
                    <vscode-checkbox>Use default arguments (from "All targets")</vscode-checkbox>
                </div>
                <div>
                    <vscode-text-area rows="10" style="width: 100%; margin-top: 1rem;">Arguments</vscode-text-area>
                </div>
            </div>
            <div>
                <h3>Combined nextpnr arguments</h3>
                <code>TODO</code>
            </div>

            <vscode-divider style="grid-column: span 2;" />

            <EDATargetFiles :targetIndex="targetIndex" workerId="nextpnr" workerName="nextpnr" type="input" />

            <vscode-divider style="grid-column: span 2;" />

            <EDATargetFiles :targetIndex="targetIndex" workerId="nextpnr" workerName="nextpnr" type="output" />
        </div>
    </template>
</template>
