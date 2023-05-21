<script lang="ts">
import {generateYosysWorkerOptions} from 'edacation';
import type {TargetConfiguration, YosysConfiguration, YosysTargetConfiguration} from 'edacation';
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
        yosys(): YosysConfiguration | YosysTargetConfiguration {
            const yosys = this.target ? this.target.yosys : this.state.project!.configuration.defaults?.yosys;
            console.log('yosys target', this.target, this.targetIndex, yosys, yosys ?? {});
            return yosys ?? {};
        },
        generated(): ReturnType<typeof generateYosysWorkerOptions> {
            if (!this.target) {
                return {
                    inputFiles: [],
                    outputFiles: [],
                    tool: '',
                    commands: []
                };
            }

            return generateYosysWorkerOptions(this.state.project!.configuration, this.state.project!.inputFiles, this.target.id);
        }
    },
    data() {
        return {
            state: globalState
        }
    }
});
</script>

<template>
    <template v-if="yosys">
        <div style="width: 100%; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="generated.commands"
                workerId="yosys"
                workerName="Yosys"
                configId="commands"
                configName="commands"
                configDescription="Commands are passed to the Yosys worker for excecution."
            />

            <vscode-divider style="grid-column: span 2;" />

            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="generated.inputFiles"
                workerId="yosys"
                workerName="Yosys"
                configId="inputFiles"
                configName="input files"
                configNameOnePerLine
                configDescription="Input files are sent from the workspace folder to the Yosys worker."
            />

            <vscode-divider style="grid-column: span 2;" />

            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="generated.outputFiles"
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
