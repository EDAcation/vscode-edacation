<script lang="ts">
import {defineComponent} from 'vue';

import {state as globalState} from '../state';
import type {TargetConfiguration, YosysConfiguration, YosysTargetConfiguration} from '../state/configuration';
import {VENDORS, type Family, type VendorId} from '../state/devices';
// import {generateYosysSynthCommands} from '../state/yosys';
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
            const yosys = this.target ? this.target.yosys : this.state.project!.configuration.yosys;
            console.log('yosys target', this.target, this.targetIndex, yosys, yosys ?? {});
            return yosys ?? {};
        },
        generatedCommands(): string[] {
            if (!this.target) {
                return [];
            }

            // return generateYosysSynthCommands([]);
            return [];
        },
        generatedInputFiles(): string[] {
            if (!this.target) {
                return [];
            }

            return [
                'design.ys'
            ];
        },
        generatedOutputFiles(): string[] {
            if (!this.target) {
                return [];
            }

            const architecture = (VENDORS[this.target.vendor as VendorId].families as Record<string, Family>)[this.target.family].architecture;

            return [
                `${architecture}.json`,
                'luts.digitaljs.json',
                'rtl.digitaljs.json'
            ];
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
                :generated="generatedCommands"
                workerId="yosys"
                workerName="Yosys"
                configId="commands"
                configName="commands"
                configDescription="Commands are passed to the Yosys worker for excecution."
            />

            <vscode-divider style="grid-column: span 2;" />

            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="generatedInputFiles"
                workerId="yosys"
                workerName="Yosys"
                configId="inputFiles"
                configName="input files"
                configDescription="Input files are sent from the workspace folder to the Yosys worker."
            />

            <vscode-divider style="grid-column: span 2;" />

            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="generatedOutputFiles"
                workerId="yosys"
                workerName="Yosys"
                configId="outputFiles"
                configName="output files"
                configDescription="Output files are sent from the workspace folder to the Yosys worker."
            />
        </div>
    </template>
</template>
