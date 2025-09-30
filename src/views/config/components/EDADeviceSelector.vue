<script lang="ts">
import {defineComponent} from 'vue';

import {syncedState as projectState} from '../../project';
import {state as globalState} from '../state';

export default defineComponent({
    data() {
        return {
            state: globalState,
            projectState
        };
    },
    computed: {},
    methods: {}
});
</script>

<template>
    <vscode-single-select style="width: 100%">
        <vscode-option> /dev/ttyXYZ </vscode-option>
    </vscode-single-select>
</template>

<style scoped></style>
