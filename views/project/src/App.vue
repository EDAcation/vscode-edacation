<script lang="ts">
import {provideVSCodeDesignSystem, vsCodeButton} from '@vscode/webview-ui-toolkit';

import EDAProject from './components/EDAProject.vue';
import {vscode} from './vscode';

provideVSCodeDesignSystem().register(
  vsCodeButton()
);

export default {
  components: {
    EDAProject
  },
  methods: {
    handleClick() {
      vscode.postMessage({
        type: 'test'
      });
    }
  }
}

</script>

<template>
  <main>
    <h1>Test</h1>
    <vscode-button @click="handleClick">Test button</vscode-button>

    <EDAProject />
  </main>
</template>

<style scoped>

</style>
