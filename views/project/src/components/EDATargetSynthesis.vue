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
    <EDATargetCheckbox worker="yosys" configTarget="optimize" label="Enable optimize">
    </EDATargetCheckbox>
</template>