<script lang="ts">
import type {
  YosysOptions,
  NextpnrOptions
} from 'edacation';
import { defineComponent } from 'vue';

import { state as globalState } from '../state';

export default defineComponent({
  props: {
    worker: {
      type: String,
      required: true
    },
    configTarget: {
      type: String,
      required: true
    },
    label: {
      type: String
    }
  },
  data() {
    return {
      state: globalState,
      option: false
    };
  },
  methods: {
    toggleOption() {
      this.option = !this.option;

      const { project } = this.state;
      if (!project) return;

      project.configuration = project.configuration || {};
      project.configuration.defaults = project.configuration.defaults || {};

      if (this.worker === 'yosys') {
        project.configuration.defaults.yosys = project.configuration.defaults.yosys || {};
        project.configuration.defaults.yosys.options = project.configuration.defaults.yosys.options || {};

        project.configuration.defaults.yosys.options[this.configTarget as keyof YosysOptions] = this.option;
      } else {
        project.configuration.defaults.nextpnr = project.configuration.defaults.nextpnr || {};
        project.configuration.defaults.nextpnr.options = project.configuration.defaults.nextpnr.options || {};

        project.configuration.defaults.nextpnr.options[this.configTarget as keyof NextpnrOptions] = this.option;
      }
    },

    handleCheckboxChange() {
      this.toggleOption();
    }
  }
});
</script>

<template>
  <vscode-checkbox v-model="option" @change="handleCheckboxChange">{{ label }}</vscode-checkbox>
</template>
