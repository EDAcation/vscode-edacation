<script lang="ts">
import type {
    TargetConfiguration,
    ValueListConfiguration,
    ValueListConfigurationTarget,
    WorkerId,
    WorkerConfiguration,
    WorkerTargetConfiguration
} from 'edacation';
import {defineComponent, type PropType} from 'vue';

import {state as globalState} from '../state';
import {firstUpperCase} from '../util';

const defaultParse = (values: string[]) => values;

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
        configNameOnePerLine: {
            type: Boolean,
            default: false
        },
        configDescription: {
            type: String,
            required: true
        },
        generated: {
            type: Array as PropType<string[]>,
            required: true
        },
        parse: {
            type: Function as PropType<(values: string[]) => string[]>,
            default: defaultParse
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
            if (!this.state.project!.configuration.defaults) {
                return undefined;
            }
            return this.state.project!.configuration.defaults[this.workerId as WorkerId];
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
            const combined = [
                ...(this.target && (!this.config || this.config.useGenerated) ? this.generated : []),
                ...(this.target && (this.config && 'useDefault' in this.config ? this.config.useDefault : true) ? this.parse(this.defaultConfig?.values ?? []) : []),
                ...(this.config ? this.parse(this.config.values) : [])
            ];
            return combined;
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

            if (!this.config) {
                if (!this.worker) {
                    if (this.target) {
                        this.target[this.workerId as WorkerId] = {};
                    } else {
                        if (!this.state.project.configuration.defaults) {
                            this.state.project.configuration.defaults = {};
                        }
                        this.state.project.configuration.defaults[this.workerId as WorkerId] = {};
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
                    Use default {{ configName }} (from "Defaults for all targets")
                </vscode-checkbox>
            </div>
            <div v-if="target">
                <vscode-checkbox :checked="config?.useGenerated ?? true" @change="handleUseGeneratedChange">
                    Use generated {{ configName }}
                </vscode-checkbox>
            </div>
            <div>
                <vscode-text-area
                    rows="10"
                    :placeholder="configNameTitle"
                    :value="(config?.values ?? []).join('\n')"
                    @input="handleValuesChange"
                    style="width: 100%; margin-top: 1rem;"
                >
                    {{ configNameTitle }}{{ configNameOnePerLine ? ' (one per line)' : '' }}
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
