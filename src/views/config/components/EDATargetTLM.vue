<script lang="ts">
/* global NodeJS, setTimeout, clearTimeout */
import type {VscodeTextfield} from '@vscode-elements/elements';
import {ProjectTarget, type YosysOptions, getYosysDefaultOptions, getYosysOptions} from 'edacation';
import {defineComponent} from 'vue';

import {syncedState as projectState} from '../../project';
import {state as globalState} from '../state';

let debounceTimer: NodeJS.Timeout | undefined = undefined;

export default defineComponent({
    data() {
        return {
            state: globalState,
            projectState
        };
    },
    computed: {
        targets(): ProjectTarget[] {
            return this.projectState.project?.getTargets() ?? [];
        },
        selectedTarget(): ProjectTarget | null {
            if (this.state.selectedTargetId === undefined) {
                return this.targets[0] ?? null;
            }
            return this.projectState.project?.getTarget(this.state.selectedTargetId) ?? null;
        },

        effectiveOptions(): YosysOptions | null {
            if (!this.projectState.project) return null;

            const projectConfig = this.projectState.project.getConfiguration();

            if (!this.selectedTarget) {
                // Default configuration
                return getYosysDefaultOptions(projectConfig);
            } else {
                // Target configuration
                return getYosysOptions(projectConfig, this.selectedTarget.id);
            }
        },
        topLevelModule(): string | null {
            return this.effectiveOptions?.topLevelModule ?? null;
        }
    },
    methods: {
        handleTLMChange(event: Event) {
            if (!this.selectedTarget) return;

            const newTlm = (event.target as VscodeTextfield).value;
            if (debounceTimer !== undefined) {
                clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(() => {
                if (this.selectedTarget) {
                    this.projectState.project?.setTopLevelModule(this.selectedTarget.id, newTlm);
                }
                debounceTimer = undefined;
            }, 300);
        }
    }
});
</script>

<template>
    <vscode-textfield placeholder="Automatic" :value="topLevelModule" style="width: 100%" @input="handleTLMChange" />
</template>

<style scoped></style>
