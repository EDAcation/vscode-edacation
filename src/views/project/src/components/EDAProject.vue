<script lang="ts">
import {defineComponent} from 'vue';

import {state as globalState} from '../state';

import EDATarget from './EDATarget.vue';
import type { TargetConfiguration } from 'edacation';

export default defineComponent({
    components: {
        EDATarget
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
        targets(): TargetConfiguration[] {
            return this.state.project?.configuration.targets ?? [];
        }
    },
    data() {
        return {
            state: globalState
        };
    },
    methods: {
        getNewTargetId(): string {
            const takenIds = this.targets.map(target => target.id);

            let index = this.targets.length + 1;
            while (takenIds.includes(`target${index}`)) index++;

            return `target${index}`;
        },
        getDuplicateTargetId(oldId: string): string {
            const match = oldId.match(/^(.*)(\d)+$/)
            let base: string;
            let seq: number;
            if (match) {
                base = match[1];
                seq = Number(match[2]) + 1;
            } else {
                base = oldId;
                seq = 1;
            }

            const takenIds = this.targets.map(target => target.id);
            while (takenIds.includes(`${base}${seq}`)) seq++;

            return `${base}${seq}`;
        },
        handleNameChange(event: Event) {
            if (!this.state.project || !event.target) {
                return;
            }

            this.state.project.name = (event.target as HTMLInputElement).value;
        },
        handleTargetAdd() {
            if (!this.state.project) {
                return;
            }

            this.state.project.configuration.targets.push({
                id: this.getNewTargetId(),
                name: `Target ${this.targets.length + 1}`,
                vendor: 'generic',
                family: 'generic',
                device: 'generic',
                package: 'generic'
            });
            // TODO: This does not work, because does not yet exist, due to sync issues
            // this.state.selectedTargetIndex = (index - 1).toString();
        },
        handleTargetDuplicate() {
            const targetIndex = this.targetIndex;
            if (!this.state.project || targetIndex === undefined) {
                return;
            }

            const curTarget = this.targets[targetIndex];
            if (!curTarget) return;

            this.state.project.configuration.targets.push({
                ...curTarget,
                id: this.getDuplicateTargetId(curTarget.id),
                name: `Target ${this.targets.length + 1}`
            });
            // TODO: This does not work, because does not yet exist, due to sync issues
            // this.state.selectedTargetIndex = (index - 1).toString();
        },
        handleTargetDelete() {
            if (!this.state.project || this.targetIndex === undefined) {
                return;
            }

            this.state.project.configuration.targets.splice(this.targetIndex, 1);
            this.targetIndex = 0;
        }
    }
});
</script>

<template>
    <template v-if="state.project">
        <h1>Project</h1>
        <vscode-text-field placeholder="Project name" :value="state.project.name" @input="handleNameChange">
            Project name
        </vscode-text-field>

        <h1>Targets</h1>
        <p>Select target to configure</p>
        <vscode-dropdown v-model.number="targetIndex" style="width: 20rem">
            <vscode-option v-for="(target, index) in targets" :key="index" :value="index">
                {{ target.name }}
            </vscode-option>
        </vscode-dropdown>


        <vscode-button v-if="targetIndex !== undefined" style="margin-start: 1rem" @click="handleTargetDelete">
            Delete target
        </vscode-button>

        <div style="display: flex; gap: 1rem">
            <vscode-button style="margin-top: 1rem" @click="handleTargetAdd">Add target</vscode-button>
            <vscode-button
                v-if="targetIndex !== undefined"
                style="margin-top: 1rem"
                @click="handleTargetDuplicate"
            >Duplicate target</vscode-button>
        </div>

        <p v-if="targets.length === 0"><b>Error:</b> At least one target is required.</p>

        <vscode-divider style="margin-top: 1rem" />

        <EDATarget v-if="targetIndex !== undefined" :targetIndex="Number(targetIndex)" />
    </template>
    <template v-else>
        <p>No project configuration available.</p>
    </template>
</template>

<style scoped></style>
