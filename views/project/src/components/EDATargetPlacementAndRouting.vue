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
            workerId="nextpnr"
            configId="placedSvg"
            configName="Enable placed SVG output"
        />
        <EDATargetCheckbox
            :targetIndex="targetIndex"
            workerId="nextpnr"
            configId="routedSvg"
            configName="Enable routed SVG output"
        />
        <EDATargetCheckbox
            :targetIndex="targetIndex"
            workerId="nextpnr"
            configId="routedJson"
            configName="Enable routed JSON output"
        />
    </div>
</template>
