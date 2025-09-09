import {createApp} from 'vue';

import App from './App.vue';
import {initializeState} from './state.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeState();

    createApp(App).mount('#app');
});
