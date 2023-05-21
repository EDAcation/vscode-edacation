<script lang="ts">
import {generateNextpnrWorkerOptions, parseNextpnrArguments} from 'edacation';
import type {TargetConfiguration, NextpnrConfiguration, NextpnrTargetConfiguration} from 'edacation';
import {defineComponent} from 'vue';

import {state as globalState} from '../state';
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
            const nextpnr = this.target ? this.target.nextpnr : this.state.project!.configuration.defaults?.nextpnr;
            console.log('nextpnr target', this.target, this.targetIndex, nextpnr, nextpnr ?? {});
            return nextpnr ?? {};
        },
        generated(): ReturnType<typeof generateNextpnrWorkerOptions> {
            if (!this.target) {
                return {
                    inputFiles: [],
                    outputFiles: [],
                    tool: '',
                    arguments: []
                };
            }

            return generateNextpnrWorkerOptions(this.state.project!.configuration, this.target.id);
        }
    },
    data() {
        return {
            state: globalState
        };
    },
    methods: {
        parseNextpnrArguments
    }
});
</script>

<template>
    <template v-if="nextpnr">
        <div style="width: 100%; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="generated.arguments"
                :parse="parseNextpnrArguments"
                workerId="nextpnr"
                workerName="nextpnr"
                configId="arguments"
                configName="arguments"
                configDescription="Arguments are passed to the nextpnr worker for excecution."
            />

            <vscode-divider style="grid-column: span 2;" />

            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="generated.inputFiles"
                workerId="nextpnr"
                workerName="nextpnr"
                configId="inputFiles"
                configName="input files"
                configNameOnePerLine
                configDescription="Input files are sent from the workspace folder to the nextpnr worker."
            />

            <vscode-divider style="grid-column: span 2;" />

            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="generated.outputFiles"
                workerId="nextpnr"
                workerName="nextpnr"
                configId="outputFiles"
                configName="output files"
                configNameOnePerLine
                configDescription="Output files are sent from the workspace folder to the nextpnr worker."
            />
        </div>
    </template>
</template>
