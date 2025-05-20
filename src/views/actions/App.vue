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
    // methods: {
    //     message(event: MessageEvent) {
    //         console.log('message', event.data);

    //         switch (event.data.type) {
    //             case 'project':
    //                 this.state.project = event.data.project;

    //                 const targetCount = this.state.project?.configuration.targets.length ?? 0;
    //                 if (this.state.selectedTargetIndex < 0) this.state.selectedTargetIndex = 0;
    //                 if (this.state.selectedTargetIndex > targetCount - 1)
    //                     this.state.selectedTargetIndex = targetCount - 1;

    //                 break;
    //         }
    //     }
    // }
});
</script>

<template>
    <main>
        <EDAProjectActions />
    </main>
</template>

<style scoped></style>
