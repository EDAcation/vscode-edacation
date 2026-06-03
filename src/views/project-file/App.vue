<script lang="ts">
import '@vscode-elements/elements';
import {URI} from 'vscode-uri';
import {defineComponent} from 'vue';

import {syncedState as projectState} from '../project';
import {vscode} from '../vscode-wrapper';

import {state} from './state';

export default defineComponent({
    components: {},
    data() {
        return {
            state,
            projectState
        };
    },
    computed: {
        myProjectUri(): URI | null {
            return this.state.fileUri ? URI.parse(this.state.fileUri) : null;
        },
        isCurrentlyActive(): boolean {
            const myProjectUri = this.myProjectUri;
            if (!this.projectState.project || !myProjectUri) {
                return false;
            }

            return this.projectState.project.isUri(myProjectUri);
        },
        isCurrentlyOpen(): boolean {
            const myProjectUri = this.myProjectUri;
            if (!this.projectState.openProjects || !myProjectUri) {
                return false;
            }

            return this.projectState.openProjects.some((project) => project.isUri(myProjectUri));
        }
    },
    methods: {
        executeCommand(command: string, ...args: unknown[]) {
            vscode.postMessage({type: 'command', command, args});
        },
        openProjectConfig() {
            this.executeCommand('edacation.openProjectConfiguration');
        },
        activateProject() {
            this.executeCommand('edacation.selectProject', this.myProjectUri?.toString(), true);
        },
        openProject() {
            this.executeCommand('edacation.openProject', this.myProjectUri?.toString());
        }
    }
});
</script>

<template>
    <main>
        <div v-if="isCurrentlyActive">
            <h1>Active Project</h1>
            <p>This project is currently active. Use the button below to open its configuration window.</p>

            <vscode-button icon="rocket" @click="openProjectConfig">Open Configuration</vscode-button>
        </div>
        <div v-else-if="isCurrentlyOpen">
            <h1>Inactive Project</h1>
            <p>
                Another project is currently active. Click the button below to activate this project and open its
                configuration window.
            </p>

            <vscode-button icon="check" @click="activateProject">Activate Project</vscode-button>
        </div>
        <div v-else>
            <h1>Unopened Project</h1>
            <p>
                This project is not currently open. Click the button below to open it and view its configuration window.
            </p>

            <vscode-button icon="folder-opened" @click="openProject">Open Project</vscode-button>
        </div>
    </main>
</template>

<style scoped></style>
