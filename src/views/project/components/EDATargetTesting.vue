<script lang="ts">
import {defineComponent} from 'vue';

import {syncedState as projectState} from '../../project';
import {state as globalState} from '../state';

import EDATestbenchSelector from './EDATestbenchSelector.vue';

export default defineComponent({
    components: {
        EDATestbenchSelector
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
    <div>
        <EDATestbenchSelector :targetIndex="targetIndex" />
    </div>
</template>
