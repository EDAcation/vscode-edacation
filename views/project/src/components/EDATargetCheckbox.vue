<script lang="ts">
import type {NextpnrOptions, WorkerConfiguration, TargetConfiguration, WorkerTargetConfiguration, WorkerId, YosysOptions} from 'edacation';
import {defineComponent} from 'vue';

import {state as globalState} from '../state';

export default defineComponent({
    props: {
        workerId: {
            type: String,
            required: true
        },
        configId: {
            type: String,
            required: true
        },
        label: {
            type: String
        },
        targetIndex: {
            type: Number
        }
    },
    data() {
        return {
            state: globalState,
            option: false
        };
    },
    computed: {
        target(): TargetConfiguration | undefined {
            if (this.targetIndex === undefined) {
                return undefined;
            }
            return this.state.project!.configuration.targets[this.targetIndex];
        },
        defaultWorker(): WorkerConfiguration | undefined {
            if (!this.state.project!.configuration.defaults) {
                return undefined;
            }
            return this.state.project!.configuration.defaults[this.workerId as WorkerId];
        },
        worker(): WorkerConfiguration | WorkerTargetConfiguration | undefined {
            return this.target ? this.target[this.workerId as WorkerId] : this.defaultWorker;
        },
        config(): YosysOptions | NextpnrOptions | undefined {
            if (!this.worker) {
                return undefined;
            }
            return (this.worker as Record<string, YosysOptions | NextpnrOptions>)[this.configId];
        }
    },
    methods: {
        toggleOption() {
            this.option = !this.option;
            if (!this.config) {
                return;
            }
            (this.config as Record<string, boolean>)[this.configId] = this.option;
        },
        handleCheckboxChange() {
            this.toggleOption();
        }
    }
});
</script>

<template>
    <vscode-checkbox v-model="option" @change="handleCheckboxChange">{{ label }}</vscode-checkbox>
</template>
