<script lang="ts">
import {type NextpnrWorkerOptions, ProjectTarget, getNextpnrWorkerOptions} from 'edacation';
import {defineComponent} from 'vue';

import type {Project} from '../../../exchange';
import {syncedState as projectState} from '../../project';
import {state as globalState} from '../state';

import EDATargetCheckbox from './EDATargetCheckbox.vue';
import EDATargetValueList from './EDATargetValueList.vue';

type PotentialError<WorkerOptions> = {status: 'ok'; res: WorkerOptions} | {status: 'error'; err: Error};

export default defineComponent({
    components: {
        EDATargetCheckbox,
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
        generated(): PotentialError<NextpnrWorkerOptions | null> {
            if (!this.target || !this.projectState.project) return {status: 'ok', res: null};

            try {
                const options = getNextpnrWorkerOptions(this.projectState.project as Project, this.target.id);
                return {status: 'ok', res: options};
            } catch (err: unknown) {
                return {status: 'error', err: err as Error};
            }
        },
        generatedError(): Error | null {
            return this.generated.status === 'error' ? this.generated.err : null;
        },
        generatedOptions(): NextpnrWorkerOptions | null {
            return this.generated.status === 'ok' ? this.generated.res : null;
        }
    }
});
</script>

<template>
    <div style="width: 100%; display: grid; grid-template-columns: repeat(1, 1fr); gap: 1rem">
        <EDATargetCheckbox
            :targetIndex="targetIndex"
            workerId="nextpnr"
            configId="placedSvg"
            configName="Enable placed SVG output"
        />
        <EDATargetCheckbox
            :targetIndex="targetIndex"
            workerId="nextpnr"
            configId="routedSvg"
            configName="Enable routed SVG output"
        />
        <EDATargetCheckbox
            :targetIndex="targetIndex"
            workerId="nextpnr"
            configId="routedJson"
            configName="Enable routed JSON output"
        />
    </div>

    <vscode-divider />

    <div style="width: 100%; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem">
        <code v-if="generatedError" style="color: red; grid-column: span 2">{{ generatedError }}</code>
        <EDATargetValueList
            :targetIndex="targetIndex"
            :generated="generatedOptions?.steps[0]?.arguments ?? []"
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
