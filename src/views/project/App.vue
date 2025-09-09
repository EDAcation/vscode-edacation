<script lang="ts">
import '@vscode-elements/elements';
import {defineComponent} from 'vue';

import {syncedState as projectState} from '../project';

import EDAProject from './components/EDAProject.vue';
import {state} from './state';

export default defineComponent({
    components: {
        EDAProject
    },
    data() {
        return {
            state,
            projectState
        };
    }
});
</script>

<template>
    <main>
        <EDAProject />
    </main>
</template>

<style scoped></style>
