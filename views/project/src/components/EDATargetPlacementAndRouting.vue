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
    <EDATargetCheckbox worker="nextpnr" configTarget="placedSvg" label="Enable placedSvg"></EDATargetCheckbox>
    <EDATargetCheckbox worker="nextpnr" configTarget="routedSvg" label="Enable routedSvg"></EDATargetCheckbox>
    <EDATargetCheckbox worker="nextpnr" configTarget="routedJson" label="Enable routedJson"></EDATargetCheckbox>
</template>