<script lang="ts">
import {defineComponent} from 'vue';

import {state} from '../state';
import type {TargetConfiguration, YosysConfiguration} from '../state/configuration';
import EDATargetFiles from './EDATargetFiles.vue';

export default defineComponent({
    components: {
        EDATargetFiles
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
        yosys(): YosysConfiguration {
            const yosys = this.target ? this.target.yosys : state.project!.configuration.yosys;
            if (yosys) {
                return yosys;
            }
            return {
                useGeneratedCommands: true,
                commands: []
            };
        },
    },
    data() {
        return {
            state
        }
    },
    methods: {
    }
});
</script>

<template>
    <template v-if="yosys">
        <div style="width: 100%; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
            <div>
                <h3>Yosys commands</h3>
                <p>Commands are passed to the Yosys worker for excecution.</p>
                <div>
                    <vscode-checkbox :checked="yosys.useGeneratedCommands">Use generated commands</vscode-checkbox>
                </div>
                <div v-if="target">
                    <vscode-checkbox>Use default commands (from "All targets")</vscode-checkbox>
                </div>
                <div>
                    <vscode-text-area rows="10" style="width: 100%; margin-top: 1rem;">Commands</vscode-text-area>
                </div>
            </div>
            <div>
                <h3>Combined Yosys commands</h3>
                <code>TODO</code>
            </div>

            <vscode-divider style="grid-column: span 2;" />

            <EDATargetFiles :targetIndex="targetIndex" workerId="yosys" workerName="Yosys" type="input" />

            <vscode-divider style="grid-column: span 2;" />

            <EDATargetFiles :targetIndex="targetIndex" workerId="yosys" workerName="Yosys" type="output" />
        </div>
    </template>
</template>
