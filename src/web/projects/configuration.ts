import {z} from 'zod';

import {keysForEnum} from '../util';
import {VENDORS} from './devices';


export const DEFAULT_CONFIGURATION: ProjectConfiguration = {
    targets: [
        {
            id: 'ecp5',

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

const schemaNextpnr = z.object({
    useGeneratedArguments: z.boolean().optional().default(true),
    arguments: z.array(z.string()).optional().default([]),
});

const schemaTarget = z.object({
    id: z.string().trim().min(1),
    name: z.string().optional(),

    vendor: z.enum(keysForEnum(VENDORS)),
    family: z.string(),
    device: z.string(),
    package: z.string(),

    yosys: schemaYosys
        .extend({
            useDefaultCommands: z.boolean().optional().default(true)
        })
        .optional(),
    nextpnr: schemaNextpnr
        .extend({
            useDefaultArguments: z.boolean().optional().default(true)
        })
        .optional()
});

const schemaProjectConfiguration = z.object({
    targets: z.array(schemaTarget),

    yosys: schemaYosys.optional(),
    nextpnr: schemaNextpnr.optional()
});

export type ProjectConfiguration = z.infer<typeof schemaProjectConfiguration>;
