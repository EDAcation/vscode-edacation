<script lang="ts">
import {defineComponent} from 'vue';

import {state as globalState} from '../state';
import type {TargetConfiguration} from '../state/configuration';
import EDATargetDevice from './EDATargetDevice.vue';
import EDATargetYosys from './EDATargetYosys.vue';
import EDATargetNextpnr from './EDATargetNextpnr.vue';

export default defineComponent({
    components: {
        EDATargetDevice,
        EDATargetYosys,
        EDATargetNextpnr
    },
    props: {
        targetIndex: {
            type: Number
        }
    },
    computed: {
        target(): TargetConfiguration | undefined {
            if (this.targetIndex === undefined) {
                return undefined;
            }
            return this.state.project!.configuration.targets[this.targetIndex];
        },
    },
    data() {
        return {
            state: globalState
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
                <EDATargetDevice :targetIndex="targetIndex" />
            </vscode-panel-view>

            <vscode-panel-view id="view-yosys">
                <EDATargetYosys :targetIndex="targetIndex" />
            </vscode-panel-view>

            <vscode-panel-view id="view-nextpnr">
                <EDATargetNextpnr :targetIndex="targetIndex" />
            </vscode-panel-view>
        </vscode-panels>
    </template>
</template>

<style scoped>

</style>
