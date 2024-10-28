<script lang="ts">
import {TextField} from '@vscode/webview-ui-toolkit';
import {type TargetConfiguration, type YosysOptions, getYosysDefaultOptions, getYosysOptions} from 'edacation';
import {defineComponent} from 'vue';

import * as vscode from '../../../vscode';
import {state as globalState} from '../state';

export default defineComponent({
    props: {
        targetIndex: {
            type: Number
        }
    },
    data() {
        return {
            state: globalState
        };
    },
    methods: {
        handleTLMChange(event: Event) {
            if (!this.target) return;

            const newTlm = (event.target as TextField).currentValue;
            vscode.vscode.postMessage({
                type: 'changeTlm',
                module: newTlm,
                targetId: this.target.id
            });
        }
    },
    computed: {
        target(): TargetConfiguration | null {
            if (this.targetIndex === undefined) return null;

            const targets = this.state.project?.configuration.targets ?? [];
            return targets[this.targetIndex] || null;
        },
        effectiveOptions(): YosysOptions | null {
            if (!this.state.project) return null;

            const projectConfig = this.state.project.configuration;
            const targetId = this.target?.id;

            if (!targetId) {
                // Default configuration
                return getYosysDefaultOptions(projectConfig);
            } else {
                // Target configuration
                return getYosysOptions(projectConfig, targetId);
            }
        },
        topLevelModule(): string | null {
            return this.effectiveOptions?.topLevelModule ?? null;
        }
    }
});
</script>

<template>
    <vscode-text-field placeholder="automatic" :value="topLevelModule" @input="handleTLMChange">
        Top-level module
    </vscode-text-field>
</template>

<style scoped></style>
