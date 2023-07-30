<script lang="ts">
import type {NextpnrOptions, WorkerConfiguration, WorkerId, YosysOptions} from 'edacation';
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
        workerConfig(): WorkerConfiguration | undefined {
            const {project} = this.state;
            if (!project) return;

            project.configuration = project.configuration || {};

            if (this.targetIndex !== undefined) {
                const target = project.configuration.targets[this.targetIndex];
                target[this.workerId as WorkerId] = target[this.workerId as WorkerId] || {};
                return target[this.workerId as WorkerId];
            } else {
                project.configuration.defaults = project.configuration.defaults || {};
                project.configuration.defaults[this.workerId as WorkerId] =
                    project.configuration.defaults[this.workerId as WorkerId] || {};
                return project.configuration.defaults[this.workerId as WorkerId];
            }
        }
    },
    methods: {
        toggleOption() {
            this.option = !this.option;

            const {project} = this.state;
            if (!project) return;

            project.configuration = project.configuration || {};
            project.configuration.defaults = project.configuration.defaults || {};

            const workerOptions = project.configuration.defaults[this.workerId as WorkerId];

            if (workerOptions) {
                workerOptions.options = workerOptions.options || {};

                if (this.workerId === 'yosys') {
                    (workerOptions.options as YosysOptions)[this.configId as keyof YosysOptions] = this.option;
                } else if (this.workerId === 'nextpnr') {
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
