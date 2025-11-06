<script lang="ts">
/* global NodeJS, setTimeout, clearTimeout */
import type {ProjectTarget, ValueListConfigurationTarget, WorkerId, WorkerTargetConfiguration} from 'edacation';
import {type PropType, defineComponent} from 'vue';

import {syncedState as projectState} from '../../project';
import {state as globalState} from '../state';

let debounceTimer: NodeJS.Timeout | undefined = undefined;

export default defineComponent({
    props: {
        targetIndex: {
            type: Number
        },
        workerId: {
            type: String as PropType<WorkerId>,
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
        }
    },
    data() {
        return {
            state: globalState,
            projectState
        };
    },
    computed: {
        target(): ProjectTarget | undefined {
            if (this.targetIndex === undefined) {
                return undefined;
            }
            return this.projectState.project?.getTargets()[this.targetIndex];
        },
        worker(): WorkerTargetConfiguration | undefined {
            return this.target?.config[this.workerId];
        },
        config(): ValueListConfigurationTarget | undefined {
            if (!this.worker) {
                return {
                    useGenerated: true,
                    useDefault: true,
                    values: []
                };
            }

            return (
                (this.worker as Record<string, ValueListConfigurationTarget>)[this.configId] ?? {
                    useGenerated: true,
                    useDefault: true,
                    values: []
                }
            );
        },
        combined(): string[] {
            if (!this.target) return [];

            return this.target.getEffectiveTextConfig(this.workerId, this.configId, this.generated);
        },
        configNameTitle(): string {
            // Capitalize first letter
            return `${this.configName.substring(0, 1).toUpperCase()}${this.configName.substring(1)}`;
        }
    },
    methods: {
        handleCheckboxChange(event: Event, key: 'useGenerated') {
            if (!event.target || !this.target) {
                return;
            }

            const value = (event.target as HTMLInputElement).checked;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.target.setConfig([this.workerId, this.configId as any, key], value);
        },
        handleUseGeneratedChange(event: Event) {
            return this.handleCheckboxChange(event, 'useGenerated');
        },

        handleTextAreaChange(event: Event, key: 'values') {
            if (!event.target || !this.target) {
                return;
            }

            const textValue = (event.target as HTMLTextAreaElement).value ?? '';
            const configLines = textValue.length ? textValue.split('\n') : [];
            if (debounceTimer !== undefined) {
                clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(() => {
                if (this.target) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    this.target.setConfig([this.workerId, this.configId as any, key], configLines);
                }
                debounceTimer = undefined;
            }, 300);
        },
        handleValuesChange(event: Event) {
            return this.handleTextAreaChange(event, 'values');
        }
    }
});
</script>

<template>
    <div>
        <h3>{{ workerName }} {{ configName }}</h3>
        <p>{{ configDescription }}</p>
        <div v-if="target">
            <vscode-checkbox
                :disabled="config === undefined"
                :checked="config?.useGenerated"
                @change="handleUseGeneratedChange"
            >
                Use generated {{ configName }}
            </vscode-checkbox>
        </div>
        <div>
            <vscode-textarea
                rows="10"
                :placeholder="configNameTitle"
                :value="(config?.values ?? []).join('\n')"
                style="width: 100%; margin-top: 1rem"
                @input="handleValuesChange"
            >
                {{ configNameTitle }}{{ configNameOnePerLine ? ' (one per line)' : '' }}
            </vscode-textarea>
        </div>
    </div>
    <div>
        <h3>Combined {{ workerName }} {{ configName }}</h3>
        <code v-for="(line, index) in generated" :key="index" style="display: block">
            {{ line.trim().length === 0 ? '&nbsp;' : line }}
        </code>
    </div>
</template>
