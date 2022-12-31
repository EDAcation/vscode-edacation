import {z} from 'zod';

import {keysForEnum} from '../util';
import {VENDORS} from './devices';


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

const schemaYosys = z.object({
    useGeneratedCommands: z.boolean().optional().default(true),
    commands: z.array(z.string()).optional().default([]),
});
const schemaYosysTarget = schemaYosys.extend({
    useDefaultCommands: z.boolean().optional().default(true)
})

const schemaNextpnr = z.object({
    useGeneratedArguments: z.boolean().optional().default(true),
    arguments: z.array(z.string()).optional().default([]),
});
const schemaNextpnrTarget = schemaNextpnr.extend({
    useDefaultArguments: z.boolean().optional().default(true)
});

const schemaTarget = z.object({
    name: z.string(),

    vendor: z.enum(keysForEnum(VENDORS)),
    family: z.string(),
    device: z.string(),
    package: z.string(),

    yosys: schemaYosysTarget.optional(),
    nextpnr: schemaNextpnrTarget.optional()
});

const schemaProjectConfiguration = z.object({
    targets: z.array(schemaTarget),

    yosys: schemaYosys.optional(),
    nextpnr: schemaNextpnr.optional()
});

export type ProjectConfiguration = z.infer<typeof schemaProjectConfiguration>;
export type YosysConfiguration = z.infer<typeof schemaYosys>;
export type YosysTargetConfiguration = z.infer<typeof schemaYosysTarget>;
export type NextpnrConfiguration = z.infer<typeof schemaNextpnr>;
export type NextpnrTargetConfiguration = z.infer<typeof schemaNextpnrTarget>;
