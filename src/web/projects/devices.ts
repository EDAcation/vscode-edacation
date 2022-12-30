export interface Vendor {
    id: string;
    name: string;
    url?: string;
    packages: Record<string, string>;
    families: Family[];
}

export interface Family {
    id: string;
    name: string;
    architecture: Architecture;
    url?: string;
    devices: Device[];
}

// Postfix of the nextpnr command, e.g. nextpnr-ice40
export type Architecture = 'ice40' | 'ecp5' | 'nexus' | 'gowin' | 'generic';

export interface Device {
    id: string;
    name: string;
    device: string;
    packages: string[];
}

export const VENDORS: Vendor[] = [
    {
        id: 'lattice',
        name: 'Lattice',
        url: 'https://www.latticesemi.com',
        packages: {
            /* eslint-disable @typescript-eslint/naming-convention */

            'ASG256': 'ASG256 (9 x 9 mm)',
            'BBG484': 'BBG484 (19 x 19 mm)',
            'BFG484': 'BFG484 (23 x 23 mm)',
            'bg121': '121-ball caBGA (9 x 9 mm)',
            'bg121:4k': '121-ball caBGA (9 x 9 mm)',
            'caBGA256': '256 caBGA (14 x 14 mm)',
            'caBGA381': '381 caBGA (17 x 17 mm)',
            'caBGA400': '400 caBGA (17 x 17 mm)',
            'caBGA554': '554 caBGA (23 x 23 mm)',
            'caBGA756': '756 caBGA (27 x 27 mm)',
            'cb81': '81-ball csBGA2 (5 x 5 mm)',
            'cb121': '121-ball csBGA (6 x 6 mm)',
            'cb132': '132-ball csBGA (8 x 8 mm)',
            'cb132:4k': '132-ball csBGA (8 x 8 mm)',
            'CBG256': 'CBG256 (14 x 14 mm)',
            'cm36': '36-ball ucBGA (2.5 x 2.5 mm)',
            'cm49': '49-ball ucBGA (3 x 3 mm)',
            'cm81': '81-ball ucBGA (4 x 4 mm)',
            'cm81:4k': '81-ball ucBGA (4 x 4 mm)',
            'cm121': '121-ball ucBGA (5 x 5 mm)',
            'cm121:4k': '121-ball ucBGA (5 x 5 mm)',
            'cm225': '225-ball ucBGA (7 x 7 mm)',
            'cm225:4k': '225-ball ucBGA (7 x 7 mm)',
            'ct121': '121-ball caBGA (9 x 9 mm)',
            'ct256': '256-ball caBGA (14 x 14 mm)',
            'csfBGA121': '121 csfBGA (6 x 6 mm)',
            'csfBGA285': '285 csfBGA (10 x 10 mm)',
            'csfBGA289': '289 csBGA (9.5 x 9.5 mm)',
            'LFG672': 'LFG672 (27 x 27 mm)',
            'QFN72': '72 QFN (10 x 10 mm)',
            'qn32': '32-pin QFN (5 x 5 mm)',
            'qn84': '84-pin QFNS (7 x 7 mm)',
            'swg16tr': '16-ball WLCSP (1.40 x 1.48 mm)',
            'tq144': '144-pin TQFP (20 x 20 mm)',
            'tq144:4k': '144-pin TQFP (20 x 20 mm)',
            'vq100': '100-pin VQFP (14 x 14 mm)'

            /* eslint-enable @typescript-eslint/naming-convention */
        },
        families: [
            {
                id: 'ice40',
                name: 'iCE40 LP/HX',
                architecture: 'ice40',
                url: 'https://www.latticesemi.com/iCE40',
                devices: [
                    {
                        id: 'lp384',
                        name: 'LP384',
                        device: 'lp384',
                        packages: ['cm36', 'cm49', 'qn32']
                    },
                    // NOTE: LP640 is also listed on the Lattice website, but nextpnr does not appear to support this device
                    {
                        id: 'lp1k',
                        name: 'LP1K',
                        device: 'lp1k',
                        packages: ['swg16tr', 'cm36', 'cm49', 'cm81', 'cm121', 'qn84', 'cb81', 'cb121']
                    },
                    {
                        id: 'lp4k',
                        name: 'LP4K',
                        device: 'lp8k',
                        packages: ['cm81:4k', 'cm121:4k', 'cm225:4k']
                    },
                    {
                        id: 'lp8k',
                        name: 'LP8K',
                        device: 'lp8k',
                        packages: ['cm81', 'cm121', 'cm225']
                    },
                    {
                        id: 'hx1k',
                        name: 'HX1K',
                        device: 'hx1k',
                        packages: ['cb132', 'vq100', 'tq144']
                    },
                    {
                        id: 'hx4k',
                        name: 'HX4K',
                        device: 'hx8k',
                        packages: ['cb132:4k', 'tq144:4k', 'bg121:4k']
                    },
                    {
                        id: 'hx8k',
                        name: 'HX8K',
                        device: 'hx8k',
                        packages: ['cm225', 'cb132', 'bg121', 'ct256']
                    }
                ]
            },
            {
                id: 'ecp5',
                name: 'ECP5 / ECP5-5G',
                architecture: 'ecp5',
                url: 'https://www.latticesemi.com/ECP5',
                devices: [
                    {
                        id: 'lfe5u-12',
                        name: 'LFE5U-12',
                        device: '12k',
                        // NOTE: TQFP144 is also listed on the Lattice website, but nextpnr does not appear to support it for this device
                        packages: ['csfBGA285', 'caBGA256', 'caBGA381']
                    },
                    {
                        id: 'lfe5u-25',
                        name: 'LFE5U-25',
                        device: '25k',
                        // NOTE: TQFP144 is also listed on the Lattice website, but nextpnr does not appear to support it for this device
                        packages: ['csfBGA285', 'caBGA256', 'caBGA381']
                    },
                    {
                        id: 'lfe5u-45',
                        name: 'LFE5U-45',
                        device: '45k',
                        // NOTE: TQFP144 is also listed on the Lattice website, but nextpnr does not appear to support it for this device
                        packages: ['csfBGA285', 'caBGA256', 'caBGA381', 'caBGA554']
                    },
                    {
                        id: 'lfe5u-85',
                        name: 'LFE5U-85',
                        device: '85k',
                        packages: ['csfBGA285', 'caBGA381', 'caBGA554', 'caBGA756']
                    },
                    {
                        id: 'lfe5um-25',
                        name: 'LFE5UM-25',
                        device: 'um-25k',
                        packages: ['csfBGA285', 'caBGA381']
                    },
                    {
                        id: 'lfe5um-45',
                        name: 'LFE5UM-45',
                        device: 'um-45k',
                        packages: ['csfBGA285', 'caBGA381', 'caBGA554']
                    },
                    {
                        id: 'lfe5um-85',
                        name: 'LFE5UM-85',
                        device: 'um-85k',
                        packages: ['csfBGA285', 'caBGA381', 'caBGA554', 'caBGA756']
                    },
                    {
                        id: 'lfe5um5g-25',
                        name: 'LFE5UM5G-25',
                        device: 'um5g-25k',
                        packages: ['csfBGA285', 'caBGA381']
                    },
                    {
                        id: 'lfe5um5g-45',
                        name: 'LFE5UM5G-45',
                        device: 'um5g-45k',
                        packages: ['csfBGA285', 'caBGA381', 'caBGA554']
                    },
                    {
                        id: 'lfe5um5g-85',
                        name: 'LFE5UM5G-85',
                        device: 'um5g-85k',
                        packages: ['csfBGA285', 'caBGA381', 'caBGA554', 'caBGA756']
                    }

                    // NOTE: ECP5 Automative Devices are also listed on the Lattice website, but nextpnr does not appear to support those devices
                ]
            },
            // {
            //     id: 'machxo2',
            //     name: 'MachXO2',
            //     // NOTE: MachXO2 devices exist in the Project Trellis repository, but might not be supported by a nextpnr command
            //     architecture: 'ecp5',
            //     url: 'https://www.latticesemi.com/MachXO2',
            //     devices: []
            // },
            {
                id: 'crosslink-nx',
                name: 'CrossLink-NX',
                architecture: 'nexus',
                url: 'https://www.latticesemi.com/CrossLink-NX',
                devices: [
                    {
                        id: 'lifcl-17',
                        name: 'LIFCL-17',
                        device: 'LIFCL-17',
                        // NOTE: WLCSP72 is also listed on the Lattice website, but nextpnr does not appear to support it for this device
                        packages: ['QFN72', 'csfBGA121', 'caBGA256']
                    },
                    // NOTE: LIFCL-33 is also listed on the Lattice website, but nextpnr does not appear to support this device
                    {
                        id: 'lifcl-40',
                        name: 'LIFCL-40',
                        device: 'LIFCL-40',
                        // NOTE: csfBGA121 and caBGA256 are also listed on the Lattice website, but nextpnr does not appear to support it for this device
                        packages: ['QFN72', 'csfBGA289', 'caBGA400']
                    }
                ]
            },
            {
                id: 'certus-nx',
                name: 'Certus-NX',
                architecture: 'nexus',
                url: 'https://www.latticesemi.com/Certus-NX',
                devices: [
                    // NOTE: LFD2NX-17 is also listed on the Lattice website, but nextpnr does not appear to support this device
                    {
                        id: 'lfd2nx-40',
                        name: 'LFD2NX-40',
                        device: 'LFD2NX-40',
                        // NOTE: csfBGA121 and caBGA196 are also listed on the Lattice website, but nextpnr does not appear to support it for this device
                        packages: ['caBGA256']
                    }
                ]
            },
            {
                id: 'certuspro-nx',
                name: 'CertusPro-NX',
                architecture: 'nexus',
                url: 'https://www.latticesemi.com/CertusPro-NX',
                devices: [
                    // NOTE: LFCPNX-50 is also listed on the Lattice website, but nextpnr does not appear to support this device
                    {
                        id: 'lfcpnx-100',
                        name: 'LFCPNX-100',
                        device: 'LFCPNX-100',
                        packages: ['ASG256', 'CBG256', 'BBG484', 'BFG484', 'LFG672']
                    }
                ]
            }
        ]
    }
];
