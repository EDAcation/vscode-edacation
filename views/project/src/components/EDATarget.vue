<script lang="ts">
import {defineComponent} from 'vue';

import {state} from '../state';
import type {ProjectConfiguration, YosysConfiguration, NextpnrConfiguration} from '../state/configuration';
import {VENDORS} from '../state/devices';
import type {ArrayElement} from '../util';

export default defineComponent({
    props: {
        targetIndex: {
            type: Number,
            required: true
        }
    },
    computed: {
        target(): ArrayElement<ProjectConfiguration['targets']> | undefined {
            return state.project!.configuration.targets[this.targetIndex];
        },
        yosys(): YosysConfiguration | undefined {
            if (!this.target) {
                return state.project!.configuration.yosys;
            }
            return this.target.yosys;
        },
        nextpnr(): NextpnrConfiguration | undefined {
            if (!this.target) {
                return state.project!.configuration.nextpnr;
            }
            return this.target.nextpnr;
        },
        vendors() {
            return VENDORS;
        }
    },
    data() {
        return {
            state
        }
    },
    methods: {

    }
});

</script>

<template>
    <template v-if="state.project">
        <h2 v-if="target">{{ target.name }}</h2>
        <h2 v-else>All targets</h2>

        <vscode-panels>
            <vscode-panel-tab id="tab-device" v-if="target">Device</vscode-panel-tab>
            <vscode-panel-tab id="tab-yosys">Yosys</vscode-panel-tab>
            <vscode-panel-tab id="tab-nextpnr">nextpnr</vscode-panel-tab>

            <vscode-panel-view id="tab-device" v-if="target">
                <div style="display: grid; grid-template-columns: 1fr; gap: 1rem;">
                    <div>
                        <label style="display: block; margin-bottom: 2px; cursor: pointer;">Vendor</label>
                        <vscode-dropdown :value="target.vendor" style="display: block; min-width: 20rem;">
                            <vscode-option v-for="(vendor, vendorId) in vendors" :key="vendorId">{{ vendor.name }}</vscode-option>
                        </vscode-dropdown>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 2px; cursor: pointer;">Family</label>
                        <vscode-dropdown style="display: block; min-width: 20rem;">
                            <vscode-option v-for="(vendor, vendorId) in vendors" :key="vendorId">{{ vendor.name }}</vscode-option>
                        </vscode-dropdown>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 2px; cursor: pointer;">Device</label>
                        <vscode-dropdown style="display: block; min-width: 20rem;">
                            <vscode-option v-for="(vendor, vendorId) in vendors" :key="vendorId">{{ vendor.name }}</vscode-option>
                        </vscode-dropdown>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 2px; cursor: pointer;">Package</label>
                        <vscode-dropdown style="display: block; min-width: 20rem;">
                            <vscode-option v-for="(vendor, vendorId) in vendors" :key="vendorId">{{ vendor.name }}</vscode-option>
                        </vscode-dropdown>
                    </div>
                </div>
            </vscode-panel-view>

            <vscode-panel-view id="view-yosys">
                <div style="width: 100%; display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                    <div>
                        <h3>Yosys commands</h3>
                        <p>Commands are passed to the Yosys worker for excecution.</p>
                        <div>
                            <vscode-checkbox>Use generated commands</vscode-checkbox>
                        </div>
                        <div>
                            <!-- Should only be in target config -->
                            <vscode-checkbox>Use default commands (from "All targets")</vscode-checkbox>
                        </div>
                        <div>
                            <vscode-text-area rows="10" style="width: 100%; margin-top: 1rem;">Commands</vscode-text-area>
                        </div>
                    </div>
                    <div>
                        <h3>Combined Yosys commands</h3>
                        <code>TODO</code>
                    </div>

                    <vscode-divider style="grid-column: span 2;" />

                    <div>
                        <h3>Yosys input files</h3>
                        <p>Input files are sent from the workspace folder to the Yosys worker.</p>
                        <div>
                            <vscode-checkbox>Use generated input files</vscode-checkbox>
                        </div>
                        <div>
                            <!-- Should only be in target config -->
                            <vscode-checkbox>Use default input files (from "All targets")</vscode-checkbox>
                        </div>
                        <div>
                            <vscode-text-area rows="10" style="width: 100%; margin-top: 1rem;">Input files</vscode-text-area>
                        </div>
                    </div>
                    <div>
                        <h3>Combined Yosys input files</h3>
                        <code>TODO</code>
                    </div>

                    <vscode-divider style="grid-column: span 2;" />

                    <div>
                        <h3>Yosys output files</h3>
                        <p>Output files are sent from the Yosys worker to the workspace folder.</p>
                        <div>
                            <vscode-checkbox>Use generated output files</vscode-checkbox>
                        </div>
                        <div>
                            <!-- Should only be in target config -->
                            <vscode-checkbox>Use default output files (from "All targets")</vscode-checkbox>
                        </div>
                        <div>
                            <vscode-text-area rows="10" style="width: 100%; margin-top: 1rem;">Output files</vscode-text-area>
                        </div>
                    </div>
                    <div>
                        <h3>Combined Yosys output files</h3>
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
                            <vscode-text-area rows="10" style="width: 100%; margin-top: 1rem;">Arguments</vscode-text-area>
                        </div>
                    </div>
                    <div>
                        <h3>Combined nextpnr arguments</h3>
                        <code>TODO</code>
                    </div>
                </div>
            </vscode-panel-view>
        </vscode-panels>
    </template>
</template>

<style scoped>

</style>
