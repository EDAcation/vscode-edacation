<script lang="ts">
/* global NodeJS, setTimeout, clearTimeout */
import type {VscodeTextfield} from '@vscode-elements/elements';
import {ProjectTarget, type YosysOptions, getYosysOptions} from 'edacation';
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
        target(): ProjectTarget | null {
            return this.projectState.project?.getActiveTarget() ?? null;
        },

        effectiveOptions(): YosysOptions | null {
            if (!this.projectState.project || !this.target) return null;

            const projectConfig = this.projectState.project.getConfiguration();
            return getYosysOptions(projectConfig, this.target.id);
        },
        topLevelModule(): string | null {
            return this.effectiveOptions?.topLevelModule ?? null;
        }
    },
    methods: {
        handleTLMChange(event: Event) {
            if (!this.target) return;

            const newTlm = (event.target as VscodeTextfield).value;
            if (debounceTimer !== undefined) {
                clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(() => {
                if (this.target) {
                    this.projectState.project?.setTopLevelModule(this.target.id, newTlm);
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
