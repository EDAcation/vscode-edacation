<script lang="ts">
/* global NodeJS, setTimeout, clearTimeout */
import type {VscodeTextfield} from '@vscode-elements/elements';
import {
    type FlasherConfiguration,
    type FlasherOptions,
    type FlasherTargetConfiguration,
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
    type YosysTargetConfiguration
} from 'edacation';
import {type PropType, defineComponent} from 'vue';

import {syncedState as projectState} from '../../project';
import {state as globalState} from '../state';

let debounceTimer: NodeJS.Timeout | undefined = undefined;

export default defineComponent({
    props: {
        targetIndex: {
            type: Number
        },
        workerId: {
            type: String as PropType<'yosys' | 'nextpnr' | 'iverilog' | 'flasher'>,
            required: true
        },
        configId: {
            type: String as PropType<
                keyof YosysOptions | keyof NextpnrOptions | keyof IVerilogOptions | keyof FlasherOptions
            >,
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
        defaultWorker():
            | YosysConfiguration
            | NextpnrConfiguration
            | IVerilogConfiguration
            | FlasherConfiguration
            | undefined {
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
            | FlasherConfiguration
            | FlasherTargetConfiguration
            | undefined {
            return this.target ? this.target.config[this.workerId as WorkerId] : this.defaultWorker;
        },
        effectiveOptions(): YosysOptions | NextpnrOptions | IVerilogOptions | FlasherOptions | null {
            return this.target?.getEffectiveOptions(this.workerId) ?? null;
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
            if (debounceTimer !== undefined) {
                clearTimeout(debounceTimer);
            }
            debounceTimer = setTimeout(() => {
                if (this.target) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    this.target.setConfig([this.workerId, 'options', this.configId as any], value);
                }
                debounceTimer = undefined;
            }, 300);
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
