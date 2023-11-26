<script lang="ts">
import {defineComponent} from 'vue';

import EDATargetCheckbox from './EDATargetCheckbox.vue';

export default defineComponent({
    components: {
        EDATargetCheckbox
    },
    props: {
        targetIndex: {
            type: Number
        }
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
    </div>
</template>
