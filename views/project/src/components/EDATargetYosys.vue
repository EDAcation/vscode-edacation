<script lang="ts">
import {defineComponent} from 'vue';

import {state} from '../state';
import type {TargetConfiguration, YosysConfiguration, YosysTargetConfiguration} from '../state/configuration';
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
            return state.project!.configuration.targets[this.targetIndex];
        },
        yosys(): YosysConfiguration | YosysTargetConfiguration {
            const yosys = this.target ? this.target.yosys : state.project!.configuration.yosys;
            console.log('yosys target', this.target, this.targetIndex, yosys, yosys ?? {});
            return yosys ?? {};
        },
    },
    methods: {
    }
});
</script>

<template>
    <template v-if="yosys">
        <div style="width: 100%; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
            <EDATargetValueList
                :targetIndex="targetIndex"
                workerId="yosys"
                workerName="Yosys"
                configId="commands"
                configName="commands"
                configDescription="Commands are passed to the Yosys worker for excecution."
            />

            <vscode-divider style="grid-column: span 2;" />

            <EDATargetValueList
                :targetIndex="targetIndex"
                workerId="yosys"
                workerName="Yosys"
                configId="inputFiles"
                configName="input files"
                configDescription="Input files are sent from the workspace folder to the Yosys worker."
            />

            <vscode-divider style="grid-column: span 2;" />

            <EDATargetValueList
                :targetIndex="targetIndex"
                workerId="yosys"
                workerName="Yosys"
                configId="outputFiles"
                configName="output files"
                configDescription="Output files are sent from the workspace folder to the Yosys worker."
            />
        </div>
    </template>
</template>
