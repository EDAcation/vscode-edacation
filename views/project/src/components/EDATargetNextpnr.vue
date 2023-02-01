<script lang="ts">
import {defineComponent} from 'vue';

import {state as globalState} from '../state';
import type {TargetConfiguration, NextpnrConfiguration, NextpnrTargetConfiguration} from '../state/configuration';
import {VENDORS, type Family, type VendorId} from '../state/devices';
import {generateNextpnrArguments} from '../state/nextpnr';
import EDATargetValueList from './EDATargetValueList.vue';

export default defineComponent({
    components: {
    EDATargetValueList
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
            return this.state.project!.configuration.targets[this.targetIndex];
        },
        nextpnr(): NextpnrConfiguration | NextpnrTargetConfiguration {
            const nextpnr = this.target ? this.target.nextpnr : this.state.project!.configuration.nextpnr;
            console.log('nextpnr target', this.target, this.targetIndex, nextpnr, nextpnr ?? {});
            return nextpnr ?? {};
        },
        generatedArguments(): string[] {
            if (!this.target) {
                return [];
            }

            const architecture = (VENDORS[this.target.vendor as VendorId].families as Record<string, Family>)[this.target.family].architecture;

            return generateNextpnrArguments(`${architecture}.json`);
        },
        generatedInputFiles(): string[] {
            if (!this.target) {
                return [];
            }

            const architecture = (VENDORS[this.target.vendor as VendorId].families as Record<string, Family>)[this.target.family].architecture;

            return [
                `${architecture}.json`,
            ];
        },
        generatedOutputFiles(): string[] {
            if (!this.target) {
                return [];
            }

            return [
                'routed.nextpnr.json',
                'routed.svg',
                'placed.svg'
            ];
        }
    },
    data() {
        return {
            state: globalState
        };
    },
    methods: {
    }
});
</script>

<template>
    <template v-if="nextpnr">
        <div style="width: 100%; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="generatedArguments"
                workerId="nextpnr"
                workerName="nextpnr"
                configId="arguments"
                configName="arguments"
                configDescription="Arguments are passed to the nextpnr worker for excecution."
            />

            <vscode-divider style="grid-column: span 2;" />

            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="generatedInputFiles"
                workerId="nextpnr"
                workerName="nextpnr"
                configId="inputFiles"
                configName="input files"
                configDescription="Input files are sent from the workspace folder to the nextpnr worker."
            />

            <vscode-divider style="grid-column: span 2;" />

            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="generatedOutputFiles"
                workerId="nextpnr"
                workerName="nextpnr"
                configId="outputFiles"
                configName="output files"
                configDescription="Output files are sent from the workspace folder to the nextpnr worker."
            />
        </div>
    </template>
</template>
