<script lang="ts">
import type {VscodeTextfield} from '@vscode-elements/elements';
import {
    type IVerilogConfiguration,
    type IVerilogOptions,
    type IVerilogTargetConfiguration,
    type NextpnrConfiguration,
    type NextpnrOptions,
    type NextpnrTargetConfiguration,
    ProjectTarget,
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
import {state as globalState} from '../state';

export default defineComponent({
    props: {
        targetIndex: {
            type: Number
        },
        workerId: {
            type: String as PropType<'yosys' | 'nextpnr' | 'iverilog'>,
            required: true
        },
        configId: {
            type: String as PropType<keyof YosysOptions | keyof NextpnrOptions | keyof IVerilogOptions>,
            required: true
        },
        configName: {
            type: String,
            required: true
        },
        placeholder: {
            type: String,
            required: false
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
        defaultWorker(): YosysConfiguration | NextpnrConfiguration | IVerilogConfiguration | undefined {
            const defaults = this.projectState.project?.getConfiguration().defaults;
            if (!defaults) return undefined;
            return defaults[this.workerId as WorkerId];
        },
        worker():
            | YosysConfiguration
            | YosysTargetConfiguration
            | NextpnrConfiguration
            | NextpnrTargetConfiguration
            | IVerilogConfiguration
            | IVerilogTargetConfiguration
            | undefined {
            return this.target ? this.target.config[this.workerId as WorkerId] : this.defaultWorker;
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
        handleTextfieldChange(event: Event) {
            if (!event.target || !this.target) {
                return;
            }

            const value = (event.target as VscodeTextfield).value;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.target.setConfig([this.workerId, 'options', this.configId as any], value);
        }
    }
});
</script>

<template>
    <div>
        <vscode-form-group variant="vertical">
            <vscode-label>{{ configName }}</vscode-label>
            <vscode-textfield :placeholder="placeholder" :value="effectiveValue" @input="handleTextfieldChange" />
        </vscode-form-group>
    </div>
</template>
