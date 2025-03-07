<script lang="ts">
import type {TextField} from '@vscode/webview-ui-toolkit';
import {
    type NextpnrConfiguration,
    type NextpnrOptions,
    type NextpnrTargetConfiguration,
    type TargetConfiguration,
    type WorkerId,
    type YosysConfiguration,
    type YosysOptions,
    type YosysTargetConfiguration,
    getNextpnrDefaultOptions,
    getNextpnrOptions,
    getYosysDefaultOptions,
    getYosysOptions
} from 'edacation';
import {type PropType, defineComponent} from 'vue';

import {state as globalState} from '../state';

export default defineComponent({
    props: {
        targetIndex: {
            type: Number
        },
        workerId: {
            type: String as PropType<'yosys' | 'nextpnr'>,
            required: true
        },
        configId: {
            type: String as PropType<keyof YosysOptions | keyof NextpnrOptions>,
            required: true
        },
        configName: {
            type: String,
            required: true
        },
        placeholder: {
            type: String,
            required: false
        }
    },
    data() {
        return {
            state: globalState
        };
    },
    computed: {
        target(): TargetConfiguration | undefined {
            if (this.targetIndex === undefined) {
                return undefined;
            }
            return this.state.project!.configuration.targets[this.targetIndex];
        },
        defaultWorker(): YosysConfiguration | NextpnrConfiguration | undefined {
            if (!this.state.project!.configuration.defaults) {
                return undefined;
            }
            return this.state.project!.configuration.defaults[this.workerId as WorkerId];
        },
        worker():
            | YosysConfiguration
            | YosysTargetConfiguration
            | NextpnrConfiguration
            | NextpnrTargetConfiguration
            | undefined {
            return this.target ? this.target[this.workerId as WorkerId] : this.defaultWorker;
        },
        options() {
            if (!this.worker) {
                return undefined;
            }
            return this.worker.options;
        },
        effectiveOptions(): YosysOptions | NextpnrOptions | null {
            const projectConfig = this.state.project!.configuration;
            const targetId = this.target?.id;

            if (!targetId) {
                // Default configuration
                if (this.workerId === 'yosys') return getYosysDefaultOptions(projectConfig);
                if (this.workerId === 'nextpnr') return getNextpnrDefaultOptions(projectConfig);
                return null;
            } else {
                // Target configuration
                if (this.workerId === 'yosys') return getYosysOptions(projectConfig, targetId);
                if (this.workerId === 'nextpnr') return getNextpnrOptions(projectConfig, targetId);
                return null;
            }
        },
        effectiveConfig(): string | undefined {
            if (!this.effectiveOptions) {
                return undefined;
            }
            return this.effectiveOptions[this.configId as keyof typeof this.effectiveOptions];
        }
    },
    methods: {
        ensureConfig() {
            if (!this.state.project) {
                return false;
            }

            if (!this.options) {
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

                this.worker!.options = {};
            }

            return true;
        },

        handleTextfieldChange(event: Event) {
            if (!event.target || !this.ensureConfig()) {
                return;
            }

            (this.options as Record<string, string | undefined>)[this.configId] =
                (event.target as TextField).currentValue || undefined;
        }
    }
});
</script>

<template>
    <div>
        <vscode-text-field :placeholder="placeholder" :value="effectiveConfig" @input="handleTextfieldChange">
            {{ configName }}
        </vscode-text-field>
    </div>
</template>
