<script lang="ts">
import type {VscodeCheckbox} from '@vscode-elements/elements';
import {
    type FlasherConfiguration,
    type FlasherTargetConfiguration,
    type IVerilogConfiguration,
    type IVerilogOptions,
    type IVerilogTargetConfiguration,
    type NextpnrConfiguration,
    type NextpnrOptions,
    type NextpnrTargetConfiguration,
    ProjectTarget,
    type TargetOptionTypes,
    type WorkerId,
    type YosysConfiguration,
    type YosysOptions,
    type YosysTargetConfiguration,
    getIVerilogDefaultOptions,
    getIVerilogOptions,
    getNextpnrDefaultOptions,
    getNextpnrOptions,
    getYosysDefaultOptions,
    getYosysOptions
} from 'edacation';
import {type PropType, defineComponent} from 'vue';

import {syncedState as projectState} from '../../project';
import {state as globalState} from '../state.js';

type KeysOfUnion<T> = T extends T ? keyof T : never;

export default defineComponent({
    props: {
        targetIndex: {
            type: Number
        },
        workerId: {
            type: String as PropType<WorkerId>,
            required: true
        },
        configId: {
            type: String as PropType<KeysOfUnion<TargetOptionTypes[WorkerId]>>,
            required: true
        },
        configName: {
            type: String,
            required: true
        }
    },
    data() {
        return {
            state: globalState,
            projectState
        };
    },
    computed: {
        target(): ProjectTarget | undefined {
            if (this.targetIndex === undefined) {
                return undefined;
            }
            return this.projectState.project?.getTargets()[this.targetIndex];
        },
        defaultWorker():
            | YosysConfiguration
            | NextpnrConfiguration
            | IVerilogConfiguration
            | FlasherConfiguration
            | undefined {
            const defaults = this.projectState.project?.getConfiguration().defaults;
            if (!defaults) return undefined;
            return defaults[this.workerId];
        },
        worker():
            | YosysConfiguration
            | YosysTargetConfiguration
            | NextpnrConfiguration
            | NextpnrTargetConfiguration
            | IVerilogConfiguration
            | IVerilogTargetConfiguration
            | FlasherConfiguration
            | FlasherTargetConfiguration
            | undefined {
            return this.target ? this.target.config[this.workerId] : this.defaultWorker;
        },
        effectiveOptions(): YosysOptions | NextpnrOptions | IVerilogOptions | null {
            // TODO: move this logic to edacation package
            const projectConfig = this.projectState.project?.getConfiguration();
            if (!projectConfig) return null;
            const targetId = this.target?.id;

            if (!targetId) {
                // Default configuration
                if (this.workerId === 'yosys') return getYosysDefaultOptions(projectConfig);
                if (this.workerId === 'nextpnr') return getNextpnrDefaultOptions(projectConfig);
                if (this.workerId === 'iverilog') return getIVerilogDefaultOptions(projectConfig);
                return null;
            } else {
                // Target configuration
                if (this.workerId === 'yosys') return getYosysOptions(projectConfig, targetId);
                if (this.workerId === 'nextpnr') return getNextpnrOptions(projectConfig, targetId);
                if (this.workerId === 'iverilog') return getIVerilogOptions(projectConfig, targetId);
                return null;
            }
        },
        effectiveValue(): boolean | undefined {
            if (!this.effectiveOptions) {
                return undefined;
            }
            return this.effectiveOptions[this.configId as keyof typeof this.effectiveOptions];
        }
    },
    methods: {
        handleCheckboxChange(event: Event) {
            if (!event.target || this.target === undefined) {
                return;
            }

            const checked = (event.target as VscodeCheckbox).checked;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.target.setConfig([this.workerId, 'options', this.configId as any], checked);
        }
    }
});
</script>

<template>
    <div>
        <vscode-checkbox :checked="effectiveValue" :disabled="target === undefined" @change="handleCheckboxChange">{{
            configName
        }}</vscode-checkbox>
    </div>
</template>
