<script lang="ts">

export default {
    data() {
        return {
            project: null
        }
    },
    mounted() {
        window.addEventListener('message', this.message);
    },
    unmounted() {
        window.removeEventListener('message', this.message);
    },
    methods: {
        message(event: MessageEvent) {
            if (event.data.type) {
                console.log('message', event.data);
            }

            switch (event.data.type) {
                case 'project':
                    this.project = event.data.project;
                    break;
            }
        }
    }
}

</script>

<template>
    <code>{{ project }}</code>
</template>

<style scoped>

</style>
