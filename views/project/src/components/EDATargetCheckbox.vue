<script lang="ts">
import type {
    NextpnrOptions,
    TargetConfiguration,
    WorkerConfiguration,
    WorkerId,
    WorkerTargetConfiguration,
    YosysOptions
} from 'edacation';
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
            option: false,
        };
    },
    created() {
        this.option = this.checkOption();
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
        
    },

    methods: {
        toggleOption() {
            this.option = !this.option;
          
            if (!this.target) return;
            this.target[this.workerId as WorkerId] = this.target[this.workerId as WorkerId] || {};
            let workerOptions = this.target[this.workerId as WorkerId];
            workerOptions = workerOptions || {};
            workerOptions.options = workerOptions.options || {};

            if (this.workerId === 'yosys') {
                (workerOptions.options as YosysOptions)[this.configId as keyof YosysOptions] = this.option;
            } else if (this.workerId === 'nextpnr') {
                (workerOptions.options as NextpnrOptions)[this.configId as keyof NextpnrOptions] = this.option;
            }

        },
        checkOption() {
            if (!this.target) return false;
            if (!this.target[this.workerId as WorkerId]) return false;
            let workerOptions = this.target[this.workerId as WorkerId];
            if(!workerOptions) return false;
            if(!workerOptions.options) return false;


            if (this.workerId === 'yosys') {
               return (workerOptions.options as YosysOptions)[this.configId as keyof YosysOptions] ?? false;
            } else if (this.workerId === 'nextpnr') {
                return (workerOptions.options as NextpnrOptions)[this.configId as keyof NextpnrOptions] ?? false;
            }            
            return false;

        },
        handleCheckboxChange() {
            this.toggleOption();
        }
    }
});
</script>

<template>
    <vscode-checkbox :checked = "option" v-bind="option" @change="handleCheckboxChange" >{{ label }}</vscode-checkbox>
</template>
