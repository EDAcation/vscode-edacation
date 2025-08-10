<script lang="ts">
import {VscodeTextfield} from '@vscode-elements/elements';
import {type TargetConfiguration, type YosysOptions, getYosysDefaultOptions, getYosysOptions} from 'edacation';
import {defineComponent} from 'vue';

import {syncedState as projectState} from '../../project';
import {state as globalState} from '../state';

export default defineComponent({
    props: {
        targetIndex: {
            type: Number
        }
    },
    data() {
        return {
            state: globalState,
            projectState
        };
    },
    methods: {
        handleTLMChange(event: Event) {
            if (!this.target) return;

            const newTlm = (event.target as VscodeTextfield).value;
            projectState.project?.setTopLevelModule(this.target.id, newTlm);
        }
    },
    computed: {
        target(): TargetConfiguration | null {
            if (this.targetIndex === undefined) return null;

            const targets = this.projectState.project?.getConfiguration().targets ?? [];
            return targets[this.targetIndex] || null;
        },
        effectiveOptions(): YosysOptions | null {
            if (!this.projectState.project) return null;

            const projectConfig = this.projectState.project.getConfiguration();
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
    <vscode-textfield
        placeholder="Top-level module (optional)"
        :value="topLevelModule"
        @input="handleTLMChange"
        style="width: 100%"
    ></vscode-textfield>
</template>

<style scoped></style>
