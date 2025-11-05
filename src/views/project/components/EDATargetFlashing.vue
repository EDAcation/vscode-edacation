<script lang="ts">
import {type FlasherStep, type FlasherWorkerOptions, ProjectTarget, getFlasherWorkerOptions} from 'edacation';
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
        EDATargetValueList,
        EDATargetTextfield
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
        generated(): PotentialError<FlasherWorkerOptions | null> {
            if (!this.target || !this.projectState.project) return {status: 'ok', res: null};

            try {
                const options = getFlasherWorkerOptions(this.projectState.project as Project, this.target.id);
                return {status: 'ok', res: options};
            } catch (err: unknown) {
                return {status: 'error', err: err as Error};
            }
        },
        generatedError(): Error | null {
            return this.generated.status === 'error' ? this.generated.err : null;
        },
        generatedOptions(): FlasherWorkerOptions | null {
            return this.generated.status === 'ok' ? this.generated.res : null;
        },
        packerStep(): FlasherStep | null {
            return this.generatedOptions?.steps[0] ?? null;
        },
        flasherStep(): FlasherStep | null {
            return this.generatedOptions?.steps[1] ?? null;
        }
    }
});
</script>

<template>
    <div style="width: 100%; display: grid; grid-template-columns: repeat(1, 1fr); gap: 1rem">
        <EDATargetTextfield
            :targetIndex="targetIndex"
            workerId="flasher"
            configId="board"
            configName="Target board to flash"
        />
    </div>

    <vscode-divider />

    <div style="width: 100%; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem">
        <code v-if="generatedError" style="color: red; grid-column: span 2">{{ generatedError }}</code>
        <EDATargetValueList
            :targetIndex="targetIndex"
            :generated="packerStep?.arguments ?? []"
            workerId="flasher"
            workerName="packer"
            configId="packerArguments"
            configName="arguments"
            :configDescription="`Arguments are passed to ${packerStep?.tool ?? 'the packer'}.`"
        />

        <vscode-divider style="grid-column: span 2" />

        <EDATargetValueList
            :targetIndex="targetIndex"
            :generated="flasherStep?.arguments ?? []"
            workerId="flasher"
            workerName="flasher"
            configId="flasherArguments"
            configName="arguments"
            :configDescription="`Arguments are passed to ${flasherStep?.tool ?? 'the flasher'}.`"
        />

        <vscode-divider style="grid-column: span 2" />

        <EDATargetValueList
            :targetIndex="targetIndex"
            :generated="generatedOptions?.inputFiles ?? []"
            workerId="flasher"
            workerName="flasher"
            configId="inputFiles"
            configName="input files"
            configNameOnePerLine
            configDescription="Input files are sent from the workspace folder to the packer and flasher."
        />

        <vscode-divider style="grid-column: span 2" />

        <EDATargetValueList
            :targetIndex="targetIndex"
            :generated="generatedOptions?.outputFiles ?? []"
            workerId="flasher"
            workerName="flasher"
            configId="outputFiles"
            configName="output files"
            configNameOnePerLine
            configDescription="Output files are sent from the workspace folder to the packer and flasher."
        />
    </div>
</template>
