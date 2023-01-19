import {z} from 'zod';

import type {ArrayElement} from '../util';

export const DEFAULT_CONFIGURATION: ProjectConfiguration = {
    targets: [
        {
            name: 'ECP5 - LFE5U-12 - caBGA381',

            vendor: 'lattice',
            family: 'ecp5',
            device: 'lfe5u-12',
            package: 'caBGA381'
        }
    ]
};

const schemaValueList = z.object({
    useGenerated: z.boolean().optional().default(true),
    values:  z.array(z.string()).optional().default([])
});
const schemaValueListTarget = schemaValueList.extend({
    useDefault: z.boolean().optional().default(true)
});

const schemaWorker = z.object({
    inputFiles: schemaValueList.optional(),
    outputFiles: schemaValueList.optional()
});
const schemaWorkerTarget = z.object({
    inputFiles: schemaValueListTarget.optional(),
    outputFiles: schemaValueListTarget.optional()
});

const schemaYosys = z.object({
    commands: schemaValueList.optional()
});
const schemaYosysTarget = z.object({
    commands: schemaValueListTarget.optional()
});

const schemaNextpnr = z.object({
    arguments: schemaValueList.optional()
});
const schemaNextpnrTarget = z.object({
    arguments: schemaValueListTarget.optional()
});

const schemaCombinedYosys = schemaWorker.merge(schemaYosys);
const schemaCombinedYosysTarget = schemaWorkerTarget.merge(schemaYosysTarget);
const schemaCombinedNextpnr = schemaWorker.merge(schemaNextpnr);
const schemaCombinedNextpnrTarget = schemaWorkerTarget.merge(schemaNextpnrTarget);

const schemaTarget = z.object({
    name: z.string(),

    vendor: z.string(),
    family: z.string(),
    device: z.string(),
    package: z.string(),

    yosys: schemaCombinedYosysTarget.optional(),
    nextpnr: schemaCombinedNextpnrTarget.optional()
});

export const schemaProjectConfiguration = z.object({
    targets: z.array(schemaTarget),

    yosys: schemaCombinedYosys.optional(),
    nextpnr: schemaCombinedNextpnr.optional()
});

export type ProjectConfiguration = z.infer<typeof schemaProjectConfiguration>;
export type TargetConfiguration = ArrayElement<ProjectConfiguration['targets']>;
export type ValueListConfiguration = z.infer<typeof schemaValueList>;
export type ValueListConfigurationTarget = z.infer<typeof schemaValueListTarget>;
export type WorkerId = 'yosys' | 'nextpnr';
export type WorkerConfiguration = z.infer<typeof schemaWorker>;
export type WorkerTargetConfiguration = z.infer<typeof schemaWorkerTarget>;
export type YosysConfiguration = z.infer<typeof schemaYosys>;
export type YosysTargetConfiguration = z.infer<typeof schemaYosysTarget>;
export type NextpnrConfiguration = z.infer<typeof schemaNextpnr>;
export type NextpnrTargetConfiguration = z.infer<typeof schemaNextpnrTarget>;
