<script lang="ts">
import {generateNextpnrWorkerOptions} from 'edacation';
import type {ProjectTarget} from 'edacation';
import {defineComponent} from 'vue';

import {syncedState as projectState} from '../../project';
import {state as globalState} from '../state';

import EDATargetValueList from './EDATargetValueList.vue';

type PotentialError<WorkerOptions> = {status: 'ok'; res: WorkerOptions} | {status: 'error'; err: Error};

export default defineComponent({
    components: {
        EDATargetValueList
    },
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
            if (this.targetIndex === undefined) {
                return undefined;
            }
            return this.projectState.project?.getTargets()[this.targetIndex];
        },
        generated(): PotentialError<ReturnType<typeof generateNextpnrWorkerOptions> | null> {
            if (!this.target || !this.projectState.project) return {status: 'ok', res: null};

            try {
                const options = generateNextpnrWorkerOptions(
                    this.projectState.project.getConfiguration(),
                    this.target.id
                );
                return {status: 'ok', res: options};
            } catch (err: unknown) {
                return {status: 'error', err: err as Error};
            }
        },
        generatedError(): Error | null {
            return this.generated.status === 'error' ? this.generated.err : null;
        },
        generatedOptions(): ReturnType<typeof generateNextpnrWorkerOptions> | null {
            return this.generated.status === 'ok' ? this.generated.res : null;
        }
    }
});
</script>

<template>
    <div style="width: 100%; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem">
        <code v-if="generatedError" style="color: red; grid-column: span 2">{{ generatedError }}</code>
        <EDATargetValueList
            :targetIndex="targetIndex"
            :generated="generatedOptions?.steps[0].arguments ?? []"
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
