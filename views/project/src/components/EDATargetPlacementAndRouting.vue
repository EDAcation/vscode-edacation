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
    },
})
</script>

<template>
    <EDATargetCheckbox :targetIndex="targetIndex" worker-id="nextpnr" config-id="placedSvg" label="Enable Placed Scalable Vector Graphics (SVG) Output"></EDATargetCheckbox>
    <EDATargetCheckbox :targetIndex="targetIndex" worker-id="nextpnr" config-id="routedSvg" label="Enable Routed Scalable Vector Graphics (SVG) Output"></EDATargetCheckbox>
    <EDATargetCheckbox :targetIndex="targetIndex" worker-id="nextpnr" config-id="routedJson" label="Enable Routed JSON Output"></EDATargetCheckbox>
</template>