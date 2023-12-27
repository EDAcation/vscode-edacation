<script lang="ts">
import {defineComponent} from 'vue';

import {state as globalState} from '../state';
import * as vscode from '../vscode';

export default defineComponent({
    components: {},
    computed: {},
    data() {
        return {
            state: globalState
        };
    },
    methods: {
        executeCommand(command: string) {
            vscode.vscode.postMessage(command);
        },

        something() {
            if (globalState.project) {
                //I wanted to use the OpenProjectCommand that is defined in project.ts but this isn't working out
                //vscode.commands.executeCommand('vscode.openWith', globalState.project.OpenProjectCommand, ProjectEditor.getViewType());
            }
        }
    }
});
</script>

<template>
    <div style="flex-direction: row; align-items: stretch">
        <vscode-button style="margin: 0.5rem" @click="executeCommand('openProjectConfiguration')"
            >Open Project Configuration</vscode-button
        >
        <vscode-button style="margin: 0.5rem" @click="executeCommand('runRTL')">Show RTL</vscode-button>
        <vscode-button style="margin: 0.5rem" @click="executeCommand('runYosys')">Synthesize using Yosys</vscode-button>
        <vscode-button style="margin: 0.5rem" @click="executeCommand('runNextpnr')"
            >Place and Route using nextpnr</vscode-button
        >
    </div>
</template>

<style scoped></style>
