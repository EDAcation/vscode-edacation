<script lang="ts">
import type {VscodeCheckbox} from '@vscode-elements/elements';
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
    type TargetOptionTypes,
    type WorkerId,
    type YosysConfiguration,
    type YosysOptions,
    type YosysTargetConfiguration
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
            projectState,
            textfieldId: `textfield-${Math.random().toString(36).slice(2, 10)}`
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
    <vscode-form-group variant="horizontal">
        <vscode-label :for="textfieldId">{{ configName }}</vscode-label>
        <vscode-form-group variant="vertical" class="target-form-vertical">
            <vscode-checkbox
                :id="textfieldId"
                :checked="effectiveValue"
                :disabled="target === undefined"
                @change="handleCheckboxChange"
                >Enable</vscode-checkbox
            >
            <vscode-form-helper>
                <p><slot></slot></p>
            </vscode-form-helper>
        </vscode-form-group>
    </vscode-form-group>
</template>

<style scoped>
.target-form-vertical {
    margin-top: 0;
    margin-bottom: 0;
    min-width: 0;
    flex: 1;
}
</style>
