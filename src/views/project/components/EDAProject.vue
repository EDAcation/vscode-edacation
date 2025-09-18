<script lang="ts">
/* global NodeJS, setTimeout, clearTimeout */
import type {VscodeSingleSelect} from '@vscode-elements/elements';
import type {ProjectTarget} from 'edacation';
import {defineComponent} from 'vue';

import {syncedState as projectState} from '../../project';
import {state as globalState} from '../state.js';

import EDATarget from './EDATarget.vue';

let debounceTimer: NodeJS.Timeout | undefined = undefined;

export default defineComponent({
    components: {
        EDATarget
    },
    data() {
        return {
            state: globalState,
            projectState
        };
    },
    computed: {
        targetIndex: {
            get(): number | undefined {
                if (this.targets.length === 0) return undefined;

                let selectedIndex = Number(this.state.selectedTargetIndex ?? 0);
                if (selectedIndex < 0) selectedIndex = 0;
                if (selectedIndex >= this.targets.length) selectedIndex = this.targets.length - 1;
                return selectedIndex;
            },
            set(index: number) {
                this.state.selectedTargetIndex = index;
            }
        },
        targets(): ProjectTarget[] {
            return this.projectState.project?.getTargets() ?? [];
        },
        currentTarget(): ProjectTarget | undefined {
            if (this.targetIndex === undefined) return undefined;
            return this.targets[this.targetIndex];
        }
    },
    methods: {
        handleNameChange(event: Event) {
            if (!event.target) return;

            if (debounceTimer !== undefined) {
                clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(() => {
                this.projectState.project?.setName((event.target as HTMLInputElement).value);
                debounceTimer = undefined;
            }, 300);
        },
        handleTargetChange(event: Event) {
            this.state.selectedTargetIndex = (event.target as VscodeSingleSelect).selectedIndex;
        },
        handleTargetAdd() {
            // target ID is auto-generated
            this.projectState.project?.addTarget();
        },
        handleTargetDuplicate() {
            if (this.targetIndex === undefined || this.currentTarget === undefined) {
                return;
            }

            this.projectState.project?.addTarget(undefined, this.currentTarget.config);
        },
        handleTargetDelete() {
            if (this.currentTarget === undefined) {
                return;
            }

            this.projectState.project?.removeTarget(this.currentTarget.id);
            this.targetIndex = 0;
        }
    }
});
</script>

<template>
    <template v-if="projectState.project">
        <h1>Project</h1>
        <vscode-textfield placeholder="Project name" :value="projectState.project?.getName()" @input="handleNameChange">
            Project name
        </vscode-textfield>

        <h1>Targets</h1>

        <vscode-label>Select target to configure</vscode-label>
        <vscode-form-group variant="horizontal">
            <vscode-single-select style="margin-right: 4px" @input="handleTargetChange">
                <vscode-option v-for="(target, index) in targets" :selected="targetIndex === index">
                    {{ target.name }}
                </vscode-option>
            </vscode-single-select>

            <vscode-button icon="add" @click="handleTargetAdd" />
            <template v-if="targetIndex !== undefined">
                <vscode-button icon="copy" @click="handleTargetDuplicate" />
                <vscode-button icon="trash" @click="handleTargetDelete" />
            </template>
        </vscode-form-group>

        <p v-if="targets.length === 0"><b>Error:</b> At least one target is required.</p>

        <vscode-divider style="margin-top: 1rem" />

        <EDATarget v-if="targetIndex !== undefined" :targetIndex="Number(targetIndex)" />
    </template>
    <template v-else>
        <p>No project configuration available.</p>
    </template>
</template>

<style scoped></style>
