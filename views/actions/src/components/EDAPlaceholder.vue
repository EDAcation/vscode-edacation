<script lang="ts">
import {defineComponent} from 'vue';

import {state as globalState} from '../state';

export default defineComponent({
    components: {},
    computed: {},
    data() {
        return {
            state: globalState
        };
    },
    methods: {}
});
</script>

<template>
    <span>This is the actions view.</span>
</template>

<style scoped></style>
