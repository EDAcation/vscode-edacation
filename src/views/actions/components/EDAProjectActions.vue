<script lang="ts">
/* global document console */
import type {VscodeButton, VscodeContextMenu} from '@vscode-elements/elements';
import '@vscode/codicons/dist/codicon.css';
import {ProjectTarget} from 'edacation';
import {defineComponent} from 'vue';

import {syncedState as projectState} from '../../project';
import * as vscode from '../../vscode-wrapper';
import {state as globalState} from '../state';

import EDATargetSelector from './EDATargetSelector.vue';

export default defineComponent({
    components: {
        EDATargetSelector
    },
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

        designFiles(): string[] {
            if (!this.projectState.project) return [];

            return this.projectState.project
                .getInputFiles()
                .filter((file) => file.type === 'design')
                .map((file) => file.path);
        },
        testbenchFiles(): string[] {
            if (!this.projectState.project) return [];

            return this.projectState.project
                .getInputFiles()
                .filter((file) => file.type === 'testbench')
                .map((file) => file.path);
        }
    },
    updated() {
        const menu = document.querySelector('#dropdown-menu') as VscodeContextMenu;
        const button = document.querySelector('#toggle-menu-button') as VscodeButton;

        if (!menu || !button) return;

        menu.data = [
            {
                label: '/dev/ttyABC1',
                value: 'abcd'
            }
        ];

        button.addEventListener('click', () => {
            menu.show = !menu.show;
        });

        menu.addEventListener('vsc-select', (event) => {
            console.log(event);
        });
    },
    methods: {
        executeTargetCommand(command: string) {
            if (!this.target) return;

            vscode.vscode.postMessage({
                type: 'command',
                command: `edacation.${command}`,
                args: [this.target.id]
            });
        }
    }
});
</script>

<template>
    <div v-if="target !== null && designFiles.length > 0" class="project-actions">
        <div class="actions-grid">
            <vscode-button @click="executeTargetCommand('runRTL')">RTL</vscode-button>
            <vscode-button :disabled="testbenchFiles.length === 0" @click="executeTargetCommand('runIverilog')"
                >Waveform</vscode-button
            >
            <vscode-button @click="executeTargetCommand('runYosys')">Synthesize</vscode-button>
            <vscode-button @click="executeTargetCommand('runNextpnr')">Place & Route</vscode-button>
        </div>

        <div class="button-with-menu">
            <vscode-button-group style="width: 100%">
                <vscode-button @click="executeTargetCommand('runFlasher')">Flash to /dev/ttyXYZ0</vscode-button>
                <vscode-button id="toggle-menu-button" icon="chevron-down" title="Select device..." />
            </vscode-button-group>
            <vscode-context-menu id="dropdown-menu" class="dropdown-menu" />
        </div>
    </div>
    <div v-else style="margin-top: 1rem">
        <i>No targets or design files found in the project.</i>
    </div>
</template>

<style scoped>
.project-actions {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.actions-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
    align-items: stretch;
}
.actions-grid > * {
    width: 100%;
}

.button-with-menu {
    display: inline-block;
    position: relative;
}
.dropdown-menu {
    width: auto;
    z-index: 10;
}
</style>
