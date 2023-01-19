<script lang="ts">
import {firstUpperCase} from '@/util';
import {defineComponent} from 'vue';

import {state} from '../state';
import type {TargetConfiguration, ValueListConfiguration, ValueListConfigurationTarget, WorkerId, WorkerConfiguration, WorkerTargetConfiguration} from '../state/configuration';

// TODO: use data state: globalState again

export default defineComponent({
    props: {
        targetIndex: {
            type: Number
        },
        workerId: {
            type: String,
            required: true
        },
        workerName: {
            type: String,
            required: true
        },
        configId: {
            type: String,
            required: true
        },
        configName: {
            type: String,
            required: true
        },
        configDescription: {
            type: String,
            required: true
        }
    },
    computed: {
        target(): TargetConfiguration | undefined {
            if (this.targetIndex === undefined) {
                return undefined;
            }
            return state.project!.configuration.targets[this.targetIndex];
        },
        worker(): WorkerConfiguration | WorkerTargetConfiguration | undefined {
            const workers = this.target ? this.target : state.project!.configuration;
            return workers[this.workerId as WorkerId];
        },
        configNameTitle(): string {
            return firstUpperCase(this.configName);
        },
        config(): ValueListConfiguration | ValueListConfigurationTarget | undefined {
            if (!this.worker) {
                return undefined;
            }
            return (this.worker as Record<string, ValueListConfiguration | ValueListConfigurationTarget>)[this.configId];
        },
        combined() {
            return 'TODO';
        }
    },
    methods: {
        ensureConfig() {
            if (!state.project) {
                return false;
            }

            console.log(this.config, this.worker, this.target);

            if (!this.config) {
                if (!this.worker) {
                    if (this.target) {
                        this.target[this.workerId as WorkerId] = {};
                    } else {
                        state.project.configuration[this.workerId as WorkerId] = {};
                    }
                }

                (this.worker as Record<string, ValueListConfiguration | ValueListConfigurationTarget | undefined>)[this.configId] = {
                    useDefault: true,
                    useGenerated: true,
                    values: []
                };
            }

            return true;
        },

        handleCheckboxChange(event: Event, key: 'useDefault' | 'useGenerated') {
            if (!event.target || !this.ensureConfig()) {
                return;
            }

            (this.config as ValueListConfigurationTarget)[key] = (event.target as HTMLInputElement).checked;
        },
        handleUseDefaultChange(event: Event) {
            return this.handleCheckboxChange(event, 'useDefault');
        },
        handleUseGeneratedChange(event: Event) {
            return this.handleCheckboxChange(event, 'useGenerated');
        },

        handleTextAreaChange(event: Event, key: 'values') {
            if (!event.target || !this.ensureConfig()) {
                return;
            }

            (this.config as ValueListConfigurationTarget)[key] = ((event.target as HTMLTextAreaElement).value ?? '').split('\n');
        },
        handleValuesChange(event: Event) {
            return this.handleTextAreaChange(event, 'values');
        }
    }
});
</script>

<template>
    <template v-if="true || worker">
        <div>
            <h3>{{ workerName }} {{ configName }}</h3>
            <p>{{ configDescription }}</p>
            <div v-if="target">
                <vscode-checkbox :checked="config && 'useDefault' in config ? config?.useDefault ?? true : true" @change="handleUseDefaultChange">
                    Use default {{ configName }} (from "All targets")
                </vscode-checkbox>
            </div>
            <div>
                <vscode-checkbox :checked="config?.useGenerated ?? true" @change="handleUseGeneratedChange">
                    Use generated {{ configName }}
                </vscode-checkbox>
            </div>
            <div>
                <vscode-text-area rows="10" :value="(config?.values ?? []).join('\n')" @change="handleValuesChange" style="width: 100%; margin-top: 1rem;">
                    {{ configNameTitle }}
                </vscode-text-area>
            </div>
        </div>
        <div>
            <h3>Combined {{ workerName }} {{ configName }}</h3>
            <code>{{ combined }}</code>
        </div>
    </template>
</template>
