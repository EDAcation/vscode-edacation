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
    <EDATargetCheckbox worker-id="nextpnr" config-id="placedSvg" label="Enable Placed Scalable Vector Graphics (SVG) Output"></EDATargetCheckbox>
    <EDATargetCheckbox worker-id="nextpnr" config-id="routedSvg" label="Enable Routed Scalable Vector Graphics (SVG) Output"></EDATargetCheckbox>
    <EDATargetCheckbox worker-id="nextpnr" config-id="routedJson" label="Enable Routed JSON Output"></EDATargetCheckbox>
</template>