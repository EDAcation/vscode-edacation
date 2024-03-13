import {createApp} from 'vue';

import App from './App.vue';
import {initializeState} from './state/index.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeState();

    createApp(App).mount('#app');
});
