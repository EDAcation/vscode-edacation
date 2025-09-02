<script lang="ts">
import {
    ProjectTarget,
    generateYosysSynthCommands,
    generateYosysSynthPrepareCommands,
    generateYosysWorkerOptions
} from 'edacation';
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
        generated(): PotentialError<ReturnType<typeof generateYosysWorkerOptions> | null> {
            if (!this.target || !this.projectState.project) return {status: 'ok', res: null};

            try {
                const options = generateYosysWorkerOptions(
                    this.projectState.project.getConfiguration(),
                    this.projectState.project.getInputFiles(),
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
        generatedOptions(): ReturnType<typeof generateYosysWorkerOptions> | null {
            return this.generated.status === 'ok' ? this.generated.res : null;
        },
        generatedSynthCommands(): string[] {
            if (!this.generatedOptions) return [];

            const prepareCmds = generateYosysSynthPrepareCommands(this.generatedOptions);
            const synthCmds = generateYosysSynthCommands(this.generatedOptions);

            return prepareCmds.concat(synthCmds);
        }
    }
});
</script>

<template>
    <div style="width: 100%; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem">
        <code v-if="generatedError" style="color: red; grid-column: span 2">{{ generatedError }}</code>
        <EDATargetValueList
            :targetIndex="targetIndex"
            :generated="generatedSynthCommands"
            workerId="yosys"
            workerName="Yosys"
            configId="commands"
            configName="commands"
            configDescription="Commands are passed to the Yosys worker for excecution."
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
            configDescription="Output files are sent from the workspace folder to the Yosys worker."
        />
    </div>
</template>
