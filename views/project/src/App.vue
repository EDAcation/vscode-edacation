<script setup lang="ts">
import {provideVSCodeDesignSystem, vsCodeButton} from '@vscode/webview-ui-toolkit';

import {vscode} from './vscode';

provideVSCodeDesignSystem().register(
  vsCodeButton()
);

const handleClick = () => {
  vscode.postMessage({
    type: 'test'
  });
};

</script>

<template>
  <main>
    <h1>Test</h1>
    <vscode-button @click="handleClick">Test button</vscode-button>
  </main>
</template>

<style scoped>

</style>
