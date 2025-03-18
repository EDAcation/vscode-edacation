<script lang="ts">
import {Project, generateYosysWorkerOptions} from 'edacation';
import type {TargetConfiguration, YosysConfiguration, YosysTargetConfiguration} from 'edacation';
import {defineComponent} from 'vue';

import {state as globalState} from '../state';
import type {PotentialError} from '../util';

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
        yosys(): YosysConfiguration | YosysTargetConfiguration {
            const yosys = this.target ? this.target.yosys : this.state.project!.configuration.defaults?.yosys;
            console.log('yosys target', this.target, this.targetIndex, yosys, yosys ?? {});
            return yosys ?? {};
        },
        generated(): PotentialError<ReturnType<typeof generateYosysWorkerOptions> | null> {
            if (!this.target || !this.state.project) return {status: 'ok', res: null};

            try {
                const project = Project.deserialize(this.state.project);
                const options = generateYosysWorkerOptions(
                    this.state.project.configuration,
                    project.getInputFiles(),
                    this.target.id
                );
                return {status: 'ok', res: options};
            } catch (err: any) {
                console.trace(`Error generating Yosys worker options: ${err}`);
                return {status: 'error', err: err as Error};
            }
        },
        generatedError(): Error | null {
            return this.generated.status === 'error' ? this.generated.err : null;
        },
        generatedOptions(): ReturnType<typeof generateYosysWorkerOptions> | null {
            return this.generated.status === 'ok' ? this.generated.res : null;
        }
    },
    data() {
        return {
            state: globalState
        };
    }
});
</script>

<template>
    <template v-if="yosys">
        <div style="width: 100%; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem">
            <code v-if="generatedError" style="color: red; grid-column: span 2">{{ generatedError }}</code>
            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="generatedOptions?.commands ?? []"
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
</template>
