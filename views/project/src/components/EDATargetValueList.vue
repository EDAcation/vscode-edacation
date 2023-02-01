<script lang="ts">
import {defineComponent, type PropType} from 'vue';

import {state as globalState} from '../state';
import type {
    TargetConfiguration,
    ValueListConfiguration,
    ValueListConfigurationTarget,
    WorkerId,
    WorkerConfiguration,
    WorkerTargetConfiguration
} from '../state/configuration';
import {firstUpperCase} from '../util';

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
        },
        generated: {
            type: Array as PropType<string[]>,
            required: true
        }
    },
    computed: {
        target(): TargetConfiguration | undefined {
            if (this.targetIndex === undefined) {
                return undefined;
            }
            return this.state.project!.configuration.targets[this.targetIndex];
        },
        defaultWorker(): WorkerConfiguration | undefined {
            return this.state.project!.configuration[this.workerId as WorkerId];
        },
        worker(): WorkerConfiguration | WorkerTargetConfiguration | undefined {
            return this.target ? this.target[this.workerId as WorkerId] : this.defaultWorker;
        },
        configNameTitle(): string {
            return firstUpperCase(this.configName);
        },
        defaultConfig(): ValueListConfiguration | undefined {
            if (!this.defaultWorker) {
                return undefined;
            }
            return (this.defaultWorker as Record<string, ValueListConfiguration>)[this.configId];
        },
        config(): ValueListConfiguration | ValueListConfigurationTarget | undefined {
            if (!this.worker) {
                return undefined;
            }
            return (this.worker as Record<string, ValueListConfiguration | ValueListConfigurationTarget>)[this.configId];
        },
        combined(): string[] {
            if (!this.config) {
                return [];
            }
            return [
                ...(this.target && this.config.useGenerated? this.generated : []),
                ...(this.target && ('useDefault' in this.config ? this.config.useDefault : true) ? this.defaultConfig?.values ?? [] : []),
                ...this.config.values
            ];
        }
    },
    data() {
        return {
            state: globalState
        };
    },
    methods: {
        ensureConfig() {
            if (!this.state.project) {
                return false;
            }

            console.log(this.config, this.worker, this.target);

            if (!this.config) {
                if (!this.worker) {
                    if (this.target) {
                        this.target[this.workerId as WorkerId] = {};
                    } else {
                        this.state.project.configuration[this.workerId as WorkerId] = {};
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
            <div v-if="target">
                <vscode-checkbox :checked="config?.useGenerated ?? true" @change="handleUseGeneratedChange">
                    Use generated {{ configName }}
                </vscode-checkbox>
            </div>
            <div>
                <vscode-text-area rows="10" :value="(config?.values ?? []).join('\n')" @input="handleValuesChange" style="width: 100%; margin-top: 1rem;">
                    {{ configNameTitle }}
                </vscode-text-area>
            </div>
        </div>
        <div>
            <h3>Combined {{ workerName }} {{ configName }}</h3>
            <code v-for="(line, index) in combined" :key="index" style="display: block;">
                {{ line.trim().length === 0 ? '&nbsp;' : line }}
            </code>
        </div>
    </template>
</template>
