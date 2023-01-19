<script lang="ts">
import {defineComponent} from 'vue';

import {state} from '../state';
import type {TargetConfiguration, NextpnrConfiguration, NextpnrTargetConfiguration} from '../state/configuration';
import EDATargetFiles from './EDATargetValueList.vue';

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
        nextpnr(): NextpnrConfiguration | NextpnrTargetConfiguration {
            const nextpnr = this.target ? this.target.nextpnr : state.project!.configuration.nextpnr;
            console.log('nextpnr target', this.target, this.targetIndex, nextpnr, nextpnr ?? {});
            return nextpnr ?? {};
        },
    },
    methods: {
    }
});
</script>

<template>
    <template v-if="nextpnr">
        <div style="width: 100%; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
            <EDATargetFiles
                :targetIndex="targetIndex"
                workerId="nextpnr"
                workerName="nextpnr"
                configId="commands"
                configName="commands"
                configDescription="Commands are passed to the nextpnr worker for excecution."
            />

            <vscode-divider style="grid-column: span 2;" />

            <EDATargetFiles
                :targetIndex="targetIndex"
                workerId="nextpnr"
                workerName="nextpnr"
                configId="inputFiles"
                configName="input files"
                configDescription="Input files are sent from the workspace folder to the nextpnr worker."
            />

            <vscode-divider style="grid-column: span 2;" />

            <EDATargetFiles
                :targetIndex="targetIndex"
                workerId="nextpnr"
                workerName="nextpnr"
                configId="outputFiles"
                configName="output files"
                configDescription="Output files are sent from the workspace folder to the nextpnr worker."
            />
        </div>
    </template>
</template>
