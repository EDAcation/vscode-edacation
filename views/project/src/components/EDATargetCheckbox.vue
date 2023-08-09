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
        }
    },

    methods: {
        toggleOption() {
            console.log(this.target);
            console.log('KISH IS TINY');

            this.option = !this.option;

            const {project} = this.state;
            console.log(project);
            if (!project || !this.target) return;

            project.configuration = project.configuration || {};
            project.configuration.defaults = project.configuration.defaults || {};

            const workerOptions = this.target[this.workerId as WorkerId];
            console.log("Shrimpy");

            if (workerOptions) {
                workerOptions.options = workerOptions.options || {};

                if (this.workerId === 'yosys') {
                   
                    this.target.yosys = this.target.yosys || {};
                    this.target.yosys.options = this.target.yosys.options || {};
                    this.target.yosys.options[this.configId as keyof YosysOptions] = this.option;
                    (workerOptions.options as YosysOptions)[this.configId as keyof YosysOptions] = this.option;
                } else if (this.workerId === 'nextpnr') {
                    console.log("Tiny croquette");

                    this.target.nextpnr = this.target.nextpnr || {};
                    this.target.nextpnr.options = this.target.nextpnr.options || {};
                    this.target.nextpnr.options[this.configId as keyof NextpnrOptions] = this.option;
                    (workerOptions.options as NextpnrOptions)[this.configId as keyof NextpnrOptions] = this.option;
                }
            }
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
