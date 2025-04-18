<script lang="ts">
import {generateNextpnrWorkerOptions, parseNextpnrArguments} from 'edacation';
import type {NextpnrConfiguration, NextpnrTargetConfiguration, TargetConfiguration} from 'edacation';
import {defineComponent} from 'vue';

import {state as globalState} from '../state';
import {type PotentialError} from '../util';

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
        generated(): PotentialError<ReturnType<typeof generateNextpnrWorkerOptions> | null> {
            if (!this.target || !this.state.project) return {status: 'ok', res: null};

            try {
                const options = generateNextpnrWorkerOptions(this.state.project.configuration, this.target.id);
                return {status: 'ok', res: options};
            } catch (err: any) {
                console.trace(`Error generating Nextpnr worker options: ${err}`);
                return {status: 'error', err: err as Error};
            }
        },
        generatedError(): Error | null {
            return this.generated.status === 'error' ? this.generated.err : null;
        },
        generatedOptions(): ReturnType<typeof generateNextpnrWorkerOptions> | null {
            return this.generated.status === 'ok' ? this.generated.res : null;
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
        <div style="width: 100%; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem">
            <code v-if="generatedError" style="color: red; grid-column: span 2">{{ generatedError }}</code>
            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="generatedOptions?.steps[0].arguments ?? []"
                :parse="parseNextpnrArguments"
                workerId="nextpnr"
                workerName="nextpnr"
                configId="arguments"
                configName="arguments"
                configDescription="Arguments are passed to the nextpnr worker for execution."
            />

            <vscode-divider style="grid-column: span 2" />

            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="generatedOptions?.inputFiles ?? []"
                workerId="nextpnr"
                workerName="nextpnr"
                configId="inputFiles"
                configName="input files"
                configNameOnePerLine
                configDescription="Input files are sent from the workspace folder to the nextpnr worker."
            />

            <vscode-divider style="grid-column: span 2" />

            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="generatedOptions?.outputFiles ?? []"
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
