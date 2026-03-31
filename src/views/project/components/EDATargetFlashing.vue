<script lang="ts">
import {type FlasherStep, type FlasherWorkerOptions, ProjectTarget, getFlasherWorkerOptions} from 'edacation';
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
        EDATargetValueList,
        EDATargetTextfield
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
        generated(): PotentialError<FlasherWorkerOptions | null> {
            if (!this.target || !this.projectState.project) return {status: 'ok', res: null};

            try {
                const options = getFlasherWorkerOptions(this.projectState.project as Project, this.target.id);
                return {status: 'ok', res: options};
            } catch (err: unknown) {
                return {status: 'error', err: err as Error};
            }
        },
        generatedError(): Error | null {
            return this.generated.status === 'error' ? this.generated.err : null;
        },
        generatedOptions(): FlasherWorkerOptions | null {
            return this.generated.status === 'ok' ? this.generated.res : null;
        },
        packerStep(): FlasherStep | null {
            return this.generatedOptions?.steps[0] ?? null;
        },
        flasherStep(): FlasherStep | null {
            return this.generatedOptions?.steps[1] ?? null;
        }
    }
});
</script>

<template>
    <div style="width: 100%">
        <code v-if="generatedError" style="color: red">{{ generatedError }}</code>

        <p style="margin-bottom: 40px">
            These options configure the flashing task, which is used to load a design onto a physical FPGA.
            <br />
            Packing can be performed by various tools such as icepack (provided by
            <a href="https://github.com/YosysHQ/icestorm">Project IceStorm</a>) or ecppack (provided by
            <a href="https://github.com/YosysHQ/prjtrellis">Project Trellis</a>), depending on your device.
            <br />
            Flashing functionality is provided by
            <a href="https://github.com/trabucayre/openFPGALoader">OpenFPGALoader</a>.
        </p>

        <EDATargetTextfield
            :targetIndex="targetIndex"
            workerId="flasher"
            configId="board"
            configName="Target board to flash"
        >
            Name of the target board to flash. This should be a board supported by OpenFPGALoader. Please refer to
            <a href="https://trabucayre.github.io/openFPGALoader/compatibility/board.html"
                >OpenFPGALoader's documentation</a
            >
            for an up-to-date list of supported boards.
        </EDATargetTextfield>

        <EDATargetCheckbox
            :targetIndex="targetIndex"
            workerId="flasher"
            configId="programToFlash"
            configName="Program to flash"
        >
            If enabled, the design will be programmed to flash memory instead of SRAM. Programming to SRAM is faster,
            but not persistent across power cycles.
        </EDATargetCheckbox>

        <vscode-divider />

        <h2>Advanced Options</h2>

        <p style="margin-bottom: 40px">
            Advanced options should not be used unless you are familiar with the underlying tools. Modifying them may
            overwrite the basic options defined above.
        </p>

        <div style="width: 100%; display: grid; gap: 1rem">
            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="packerStep?.arguments ?? []"
                workerId="flasher"
                workerName="Packer"
                configId="packerArguments"
                configName="arguments"
            >
                Arguments are passed to <code>{{ packerStep?.tool ?? 'the packer' }}</code
                >. Packing is a necessary step in the flashing process. <br /><br />
                The packer command should write its output to a specific file in the target directory. This is necessary
                for the flasher to find the file. Please inspect the generated arguments for more details.
            </EDATargetValueList>

            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="flasherStep?.arguments ?? []"
                workerId="flasher"
                workerName="Flasher"
                configId="flasherArguments"
                configName="arguments"
            >
                Arguments are passed to <code>{{ flasherStep?.tool ?? 'the flasher' }}</code
                >. This is the final step in the flashing process. <br /><br />
                The flasher command should read its input from a specific file in the target directory. Please inspect
                the generated arguments for more details.
            </EDATargetValueList>

            <vscode-divider />

            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="generatedOptions?.inputFiles ?? []"
                workerId="flasher"
                workerName="Flasher"
                configId="inputFiles"
                configName="input files"
                configNameOnePerLine
            >
                Input files for the packer and flasher.
                <br /><br />
                This list helps EDAcation understand which files may be ingested by the packer and flasher. This is
                necessary for some tool providers that do not have direct access to your workspace.
            </EDATargetValueList>

            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="generatedOptions?.outputFiles ?? []"
                workerId="flasher"
                workerName="Flasher"
                configId="outputFiles"
                configName="output files"
                configNameOnePerLine
            >
                Output files for the packer and flasher.
                <br /><br />
                This list helps EDAcation understand which files may be generated by the packer and flasher. This is
                necessary to correctly process task results, as well as for some tool providers that do not have direct
                access to your workspace.
            </EDATargetValueList>
        </div>
    </div>
</template>
