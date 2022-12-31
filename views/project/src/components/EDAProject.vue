<script lang="ts">
import {defineComponent} from 'vue';

import {state} from '../state';

export default defineComponent({
    data() {
        return {
            state
        }
    },
    methods: {
        handleNameChange(event: Event) {
            if (!this.state.project || !event.target) {
                return;
            }

            this.state.project.name = (event.target as HTMLInputElement).value;
        }
    }
});

</script>

<template>
    <h1>Configuration</h1>

    <div v-if="state.project">
        <h2>Project</h2>
        <vscode-text-field placeholder="Project name" :value="state.project.name" @input="handleNameChange">Project name</vscode-text-field>

        <h2>Default target</h2>
        <p>This configuration applies to all targets, unless a target opts out of using it.</p>

        <vscode-panels>
            <vscode-panel-tab id="tab-yosys">Yosys</vscode-panel-tab>
            <vscode-panel-tab id="tab-nextpnr">nextpnr</vscode-panel-tab>
            <vscode-panel-view id="view-yosys">
                <div style="width: 100%; display: grid; grid-auto-columns: minmax(0, 1fr); grid-auto-flow: column; gap: 1rem;">
                    <div>
                        <h3>Yosys commands</h3>
                        <div>
                            <vscode-checkbox>Use generated commands</vscode-checkbox>
                        </div>
                        <div>
                            <!-- Should only be in target config -->
                            <vscode-checkbox>Use default commands</vscode-checkbox>
                        </div>
                        <div>
                            <vscode-text-area rows="10" style="width: 100%;">Commands</vscode-text-area>
                        </div>
                    </div>
                    <div>
                        <h3>Combined Yosys commands</h3>
                        <code>TODO</code>
                    </div>
                </div>
            </vscode-panel-view>
            <vscode-panel-view id="view-nextpnr">
                <div style="width: 100%; display: grid; grid-auto-columns: minmax(0, 1fr); grid-auto-flow: column; gap: 1rem;">
                    <div>
                        <h3>nextpnr arguments</h3>
                        <div>
                            <vscode-checkbox>Use generated arguments</vscode-checkbox>
                        </div>
                        <div>
                            <!-- Should only be in target config -->
                            <vscode-checkbox>Use default arguments</vscode-checkbox>
                        </div>
                        <div>
                            <vscode-text-area rows="10" style="width: 100%;">Arguments</vscode-text-area>
                        </div>
                    </div>
                    <div>
                        <h3>Combined nextpnr arguments</h3>
                        <code>TODO</code>
                    </div>
                </div>
            </vscode-panel-view>
        </vscode-panels>

        <h2>Targets</h2>
        <p></p>
    </div>
    <div v-else>
        <p>No project configuration available.</p>
    </div>

    <!-- <div>
        <code>{{ state.project }}</code>
    </div> -->
</template>

<style scoped>

</style>
