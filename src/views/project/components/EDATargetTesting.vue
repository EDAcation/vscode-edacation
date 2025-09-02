<script lang="ts">
import {defineComponent} from 'vue';

import {syncedState as projectState} from '../../project';
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
    data() {
        return {
            state: globalState,
            projectState
        };
    }
});
</script>

<template>
    <div style="width: 100%; display: grid; grid-template-columns: repeat(1, 1fr); gap: 1rem">
        <EDATargetTextfield
            :targetIndex="targetIndex"
            workerId="iverilog"
            configId="testbenchFile"
            configName="Testbench file path"
            placeholder="Automatic (first file)"
        />
    </div>
</template>
