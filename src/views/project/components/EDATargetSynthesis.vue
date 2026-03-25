<script lang="ts">
import {type ProjectTarget, type YosysWorkerOptions, getYosysSynthesisWorkerOptions} from 'edacation';
import {defineComponent} from 'vue';

import type {Project} from '../../../exchange';
import {syncedState as projectState} from '../../project';
import {state as globalState} from '../state';

import EDATargetCheckbox from './EDATargetCheckbox.vue';
import EDATargetTextfield from './EDATargetTextfield.vue';
import EDATargetValueList from './EDATargetValueList.vue';

type PotentialError<WorkerOptions> = {status: 'ok'; res: WorkerOptions} | {status: 'error'; err: Error};

export default defineComponent({
    components: {
        EDATargetCheckbox,
        EDATargetTextfield,
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
        generated(): PotentialError<YosysWorkerOptions | null> {
            if (!this.target || !this.projectState.project) return {status: 'ok', res: null};

            try {
                const options = getYosysSynthesisWorkerOptions(this.projectState.project as Project, this.target.id);
                return {status: 'ok', res: options};
            } catch (err: unknown) {
                return {status: 'error', err: err as Error};
            }
        },
        generatedError(): Error | null {
            return this.generated.status === 'error' ? this.generated.err : null;
        },
        generatedOptions(): YosysWorkerOptions | null {
            return this.generated.status === 'ok' ? this.generated.res : null;
        }
    }
});
</script>

<template>
    <div style="width: 100%; display: grid; grid-template-columns: repeat(1, 1fr); gap: 1rem">
        <EDATargetCheckbox
            :targetIndex="targetIndex"
            workerId="yosys"
            configId="optimize"
            configName="Enable Yosys optimization"
        />

        <EDATargetTextfield
            :targetIndex="targetIndex"
            workerId="yosys"
            configId="topLevelModule"
            configName="Top-level module name"
            placeholder="Automatic (Verilog only)"
        />
    </div>

    <vscode-divider />

    <div style="width: 100%; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem">
        <code v-if="generatedError" style="color: red; grid-column: span 2">{{ generatedError }}</code>
        <EDATargetValueList
            :targetIndex="targetIndex"
            :generated="generatedOptions?.steps[0]?.commands ?? []"
            workerId="yosys"
            workerName="Yosys"
            configId="synthPrepareCommands"
            configName="commands (preparation)"
            :configDescription="[
                'Preparation commands for Yosys.',
                'If after this step a file called \'presynth.yosys.json\' exists in the target directory, information about the cell types will be injected into the file. This allows partial cell information to be recovered post-synthesis.'
            ]"
        />

        <EDATargetValueList
            :targetIndex="targetIndex"
            :generated="generatedOptions?.steps[1]?.commands ?? []"
            workerId="yosys"
            workerName="Yosys"
            configId="synthCommands"
            configName="commands (synthesis)"
            :configDescription="[
                'Synthesis commands for Yosys.',
                'These commands are run after the preparation step, and should perform the actual synthesis.'
            ]"
        />

        <vscode-divider style="grid-column: span 2" />

        <EDATargetValueList
            :targetIndex="targetIndex"
            :generated="generatedOptions?.inputFiles ?? []"
            workerId="yosys"
            workerName="Yosys"
            configId="inputFiles"
            configName="input files"
            configNameOnePerLine
            configDescription="Input files are sent from the workspace folder to the Yosys worker."
        />

        <vscode-divider style="grid-column: span 2" />

        <EDATargetValueList
            :targetIndex="targetIndex"
            :generated="generatedOptions?.outputFiles ?? []"
            workerId="yosys"
            workerName="Yosys"
            configId="outputFiles"
            configName="output files"
            configNameOnePerLine
            configDescription="Output files are sent from the the workspace folder to the Yosys worker."
        />
    </div>
</template>
