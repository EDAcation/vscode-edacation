<script lang="ts">
import type {TargetConfiguration} from 'edacation';
import {defineComponent} from 'vue';

import {state as globalState} from '../state';

import EDATargetCheckbox from './EDATargetCheckbox.vue';
import EDATargetTextfield from './EDATargetTextfield.vue';

export default defineComponent({
    components: {
        EDATargetCheckbox,
        EDATargetTextfield
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
        }
    },
    data() {
        return {
            state: globalState
        };
    }
});
</script>

<template>
    <div style="width: 100%; display: grid; grid-template-columns: repeat(1, 1fr); gap: 1rem">
        <EDATargetCheckbox
            :targetIndex="targetIndex"
            workerId="yosys"
            configId="optimize"
            configName="Enable Yosys optimization"
        />

        <EDATargetTextfield
            :targetIndex="targetIndex"
            workerId="yosys"
            configId="topLevelModule"
            configName="Top-level module name"
            placeholder="Automatic (Verilog only)"
        />
    </div>
</template>
