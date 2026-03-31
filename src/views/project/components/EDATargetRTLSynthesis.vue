<script lang="ts">
import {
    type ProjectTarget,
    type YosysWorkerOptions,
    getYosysRTLWorkerOptions,
    getYosysSynthesisWorkerOptions
} from 'edacation';
import {defineComponent} from 'vue';

import type {Project} from '../../../exchange';
import {syncedState as projectState} from '../../project';
import {state as globalState} from '../state';

import EDATargetCheckbox from './EDATargetCheckbox.vue';
import EDATargetTextfield from './EDATargetTextfield.vue';
import EDATargetValueList from './EDATargetValueList.vue';

type PotentialError<WorkerOptions> = {status: 'ok'; res: WorkerOptions} | {status: 'error'; err: Error};

export default defineComponent({
    components: {
        EDATargetCheckbox,
        EDATargetTextfield,
        EDATargetValueList
    },
    props: {
        targetIndex: {
            type: Number
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
        synthGenerated(): PotentialError<YosysWorkerOptions | null> {
            if (!this.target || !this.projectState.project) return {status: 'ok', res: null};

            try {
                const options = getYosysSynthesisWorkerOptions(this.projectState.project as Project, this.target.id);
                return {status: 'ok', res: options};
            } catch (err: unknown) {
                return {status: 'error', err: err as Error};
            }
        },
        synthGeneratedError(): Error | null {
            return this.synthGenerated.status === 'error' ? this.synthGenerated.err : null;
        },
        synthGeneratedOptions(): YosysWorkerOptions | null {
            return this.synthGenerated.status === 'ok' ? this.synthGenerated.res : null;
        },
        rtlGenerated(): PotentialError<YosysWorkerOptions | null> {
            if (!this.target || !this.projectState.project) return {status: 'ok', res: null};

            try {
                const options = getYosysRTLWorkerOptions(this.projectState.project as Project, this.target.id);
                return {status: 'ok', res: options};
            } catch (err: unknown) {
                return {status: 'error', err: err as Error};
            }
        },
        rtlGeneratedError(): Error | null {
            return this.rtlGenerated.status === 'error' ? this.rtlGenerated.err : null;
        },
        rtlGeneratedOptions(): YosysWorkerOptions | null {
            return this.rtlGenerated.status === 'ok' ? this.rtlGenerated.res : null;
        }
    }
});
</script>

<template>
    <div style="width: 100%">
        <code v-if="synthGeneratedError" style="color: red">{{ synthGeneratedError.message }}</code>
        <code v-if="rtlGeneratedError" style="color: red">{{ rtlGeneratedError.message }}</code>

        <p style="margin-bottom: 40px">
            These options configure the RTL and synthesis tasks performed by
            <a href="https://github.com/YosysHQ/yosys">Yosys</a>.
        </p>

        <EDATargetCheckbox
            :targetIndex="targetIndex"
            workerId="yosys"
            configId="optimize"
            configName="Enable Yosys optimization"
        >
            Enable Yosys optimization features. This will likely improve your final design, but may make debugging more
            difficult.
        </EDATargetCheckbox>

        <EDATargetTextfield
            :targetIndex="targetIndex"
            workerId="yosys"
            configId="topLevelModule"
            configName="Top-level module name"
            placeholder="Automatic (Verilog only)"
        >
            The top-level module name of your design. Required for VHDL designs.
        </EDATargetTextfield>

        <EDATargetTextfield
            :targetIndex="targetIndex"
            workerId="yosys"
            configId="synthArguments"
            configName="Extra synthesis arguments"
        >
            Additional arguments for the synthesis step. Arguments are appended to the respective
            <code>synth_*</code> command. <br /><br />
            This option only applies to the synthesis task.
        </EDATargetTextfield>

        <vscode-divider />

        <h2>Advanced Options</h2>

        <p style="margin-bottom: 40px">
            Advanced options should not be used unless you are familiar with the underlying tools. Modifying them may
            overwrite the basic options defined above.
        </p>

        <div style="width: 100%; display: grid; gap: 1rem">
            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="synthGeneratedOptions?.steps[0]?.commands ?? []"
                workerId="yosys"
                workerName="Synthesis Preparation"
                configId="synthPrepareCommands"
                configName="commands"
            >
                Yosys commands to be executed for the preparation step. This step is executed before synthesis.
                <br /><br />
                If after this step a file called <code>presynth.yosys.json</code> exists in the target directory,
                information about the cell types will be injected into the file. This allows partial cell information to
                be recovered post-synthesis.
            </EDATargetValueList>

            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="synthGeneratedOptions?.steps[1]?.commands ?? []"
                workerId="yosys"
                workerName="Synthesis"
                configId="synthCommands"
                configName="commands"
            >
                Yosys commands to be executed for the synthesis step. This step is executed after the preparation step.
                <br /><br />
                The commands should write the synthesis result to a file called <code>&lt;chip family&gt;.json</code>
                in the target directory. This is to ensure that the nextpnr step can read from the correct file.
            </EDATargetValueList>

            <vscode-divider />

            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="rtlGeneratedOptions?.steps[0]?.commands ?? []"
                workerId="yosys"
                workerName="RTL"
                configId="rtlCommands"
                configName="commands"
            >
                Yosys commands to be executed for the RTL generation step.
                <br /><br />
                If after this step a file called <code>rtl.yosys.json</code> exists in the target directory, it will be
                automatically opened in the RTL viewer.
            </EDATargetValueList>

            <vscode-divider />

            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="synthGeneratedOptions?.inputFiles ?? []"
                workerId="yosys"
                workerName="Yosys"
                configId="inputFiles"
                configName="input files"
                configNameOnePerLine
            >
                Input files for the synthesis and RTL generation steps.
                <br /><br />
                This list helps EDAcation understand which files may be ingested by Yosys. This is necessary for some
                tool providers that do not have direct access to your workspace.
            </EDATargetValueList>

            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="synthGeneratedOptions?.outputFiles ?? []"
                workerId="yosys"
                workerName="Yosys"
                configId="outputFiles"
                configName="output files"
                configNameOnePerLine
            >
                Output files for the synthesis and RTL generation steps.
                <br /><br />
                This list helps EDAcation understand which files may be generated by Yosys. This is necessary to
                correctly process task results, as well as for some tool providers that do not have direct access to
                your workspace.
            </EDATargetValueList>
        </div>
    </div>
</template>
