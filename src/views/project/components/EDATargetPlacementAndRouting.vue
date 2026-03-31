<script lang="ts">
import {type NextpnrWorkerOptions, ProjectTarget, getNextpnrWorkerOptions} from 'edacation';
import {defineComponent} from 'vue';

import type {Project} from '../../../exchange';
import {syncedState as projectState} from '../../project';
import {state as globalState} from '../state';

import EDATargetCheckbox from './EDATargetCheckbox.vue';
import EDATargetValueList from './EDATargetValueList.vue';

type PotentialError<WorkerOptions> = {status: 'ok'; res: WorkerOptions} | {status: 'error'; err: Error};

export default defineComponent({
    components: {
        EDATargetCheckbox,
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
        generated(): PotentialError<NextpnrWorkerOptions | null> {
            if (!this.target || !this.projectState.project) return {status: 'ok', res: null};

            try {
                const options = getNextpnrWorkerOptions(this.projectState.project as Project, this.target.id);
                return {status: 'ok', res: options};
            } catch (err: unknown) {
                return {status: 'error', err: err as Error};
            }
        },
        generatedError(): Error | null {
            return this.generated.status === 'error' ? this.generated.err : null;
        },
        generatedOptions(): NextpnrWorkerOptions | null {
            return this.generated.status === 'ok' ? this.generated.res : null;
        }
    }
});
</script>

<template>
    <div style="width: 100%">
        <code v-if="generatedError" style="color: red">{{ generatedError }}</code>

        <p style="margin-bottom: 40px">
            These options configure the placement and routing task performed by
            <a href="https://github.com/YosysHQ/nextpnr">nextpnr</a>.
        </p>

        <EDATargetCheckbox
            :targetIndex="targetIndex"
            workerId="nextpnr"
            configId="routedJson"
            configName="Write routed JSON"
        >
            Write a JSON file with routing results. This option must be enabled to use the nextpnr viewer.
        </EDATargetCheckbox>

        <EDATargetCheckbox
            :targetIndex="targetIndex"
            workerId="nextpnr"
            configId="reportJson"
            configName="Write timing & utilization JSON"
        >
            Write a JSON file with detailed timing and utilization information. This option must be enabled to see
            timing information in the nextpnr viewer.
        </EDATargetCheckbox>

        <EDATargetCheckbox
            :targetIndex="targetIndex"
            workerId="nextpnr"
            configId="placedSvg"
            configName="Write placed SVG"
        >
            Write an SVG file with placement results.
            <br /><br />
            Warning: this option may cause severe performance issues in certain environments. We recommend leaving it
            disabled and using the nextpnr viewer to inspect placement results instead.
        </EDATargetCheckbox>

        <EDATargetCheckbox
            :targetIndex="targetIndex"
            workerId="nextpnr"
            configId="routedSvg"
            configName="Write routed SVG"
        >
            Write an SVG file with routing results.
            <br /><br />
            Warning: this option may cause severe performance issues in certain environments. We recommend leaving it
            disabled and using the nextpnr viewer to inspect routing results instead.
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
                :generated="generatedOptions?.steps[0]?.arguments ?? []"
                workerId="nextpnr"
                workerName="Nextpnr"
                configId="arguments"
                configName="arguments"
            >
                Arguments passed to nextpnr for placement and routing.
                <br /><br />
                The nextpnr command should write bitstream information to specific files in the target directory. This
                is necessary for FPGA flashing to work. Please inspect the generated commands for more details.
                <br /><br />
                If after this step a file called <code>routed.nextpnr.json</code> exists in the target directory, the
                nextpnr viewer will be automatically opened.
            </EDATargetValueList>

            <vscode-divider />

            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="generatedOptions?.inputFiles ?? []"
                workerId="nextpnr"
                workerName="Nextpnr"
                configId="inputFiles"
                configName="input files"
                configNameOnePerLine
            >
                Input files for placement and routing.
                <br /><br />
                This list helps EDAcation understand which files may be ingested by nextpnr. This is necessary for some
                tool providers that do not have direct access to your workspace.
            </EDATargetValueList>

            <EDATargetValueList
                :targetIndex="targetIndex"
                :generated="generatedOptions?.outputFiles ?? []"
                workerId="nextpnr"
                workerName="Nextpnr"
                configId="outputFiles"
                configName="output files"
                configNameOnePerLine
            >
                Output files for placement and routing.
                <br /><br />
                This list helps EDAcation understand which files may be generated by nextpnr. This is necessary to
                correctly process task results, as well as for some tool providers that do not have direct access to
                your workspace.
            </EDATargetValueList>
        </div>
    </div>
</template>
