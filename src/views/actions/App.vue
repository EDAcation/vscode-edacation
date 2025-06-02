<script lang="ts">
import '@vscode-elements/elements';
import {defineComponent} from 'vue';

import {syncedState as projectState} from '../project';
import {vscode} from '../vscode-wrapper';

import EDAProjectActions from './components/EDAProjectActions.vue';
import {state} from './state';

export default defineComponent({
    components: {
        EDAProjectActions
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
        <EDAProjectActions />
    </main>
</template>

<style scoped></style>
