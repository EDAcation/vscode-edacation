<script lang="ts">
import type {
    ProjectTarget,
    ValueListConfiguration,
    ValueListConfigurationTarget,
    WorkerId,
    WorkerTargetConfiguration
} from 'edacation';
import {type PropType, defineComponent} from 'vue';

import {syncedState as projectState} from '../../project';
import {state as globalState} from '../state';

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
        config(): ValueListConfiguration | ValueListConfigurationTarget | undefined {
            if (!this.worker) {
                return undefined;
            }

            return (
                (this.worker as Record<string, ValueListConfiguration | ValueListConfigurationTarget>)[
                    this.configId
                ] ?? {
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
        handleCheckboxChange(event: Event, key: 'useDefault' | 'useGenerated') {
            if (!event.target || !this.target) {
                return;
            }

            const value = (event.target as HTMLInputElement).checked;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.target.setConfig([this.workerId, this.configId as any, key], value);
        },
        handleUseDefaultChange(event: Event) {
            return this.handleCheckboxChange(event, 'useDefault');
        },
        handleUseGeneratedChange(event: Event) {
            return this.handleCheckboxChange(event, 'useGenerated');
        },

        handleTextAreaChange(event: Event, key: 'values') {
            if (!event.target || !this.target) {
                return;
            }

            const value = ((event.target as HTMLTextAreaElement).value ?? '').split('\n');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.target.setConfig([this.workerId, this.configId as any, key], value);
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
            <code v-for="(line, index) in combined" :key="index" style="display: block">
                {{ line.trim().length === 0 ? '&nbsp;' : line }}
            </code>
        </div>
    </template>
</template>
