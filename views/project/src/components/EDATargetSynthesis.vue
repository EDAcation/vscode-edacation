<script lang="ts">
import {defineComponent} from 'vue';
import EDATargetCheckbox from './EDATargetCheckbox.vue';

export default defineComponent({
    components: {
        EDATargetCheckbox
    },
})
</script>

<template>
    <EDATargetCheckbox worker-id="yosys" config-id="optimize" label="Enable Yosys optimization">
    </EDATargetCheckbox>
</template>