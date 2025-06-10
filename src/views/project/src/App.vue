<script lang="ts">
import '@vscode-elements/elements';
import {defineComponent} from 'vue';

import {vscode} from '../../vscode-wrapper';

import EDAProject from './components/EDAProject.vue';
import {ignoreSave, state} from './state';

export default defineComponent({
    components: {
        EDAProject
    },
    data() {
        return {
            state
        };
    },
    mounted() {
        window.addEventListener('message', this.message);
        vscode.postMessage({
            type: 'ready'
        });
    },
    unmounted() {
        window.removeEventListener('message', this.message);
    },
    methods: {
        message(event: MessageEvent) {
            console.log('message', event.data);

            switch (event.data.type) {
                case 'project':
                    ignoreSave(() => {
                        this.state.project = event.data.project;
                    });
                    break;
            }
        }
    }
});
</script>

<template>
    <main>
        <EDAProject />
    </main>
</template>

<style scoped></style>
