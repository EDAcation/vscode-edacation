export interface Vendor {
    name: string;
    url?: string;
    packages: Record<string, string>;
    families: Record<string, Family>;
}

export type VendorId = keyof typeof VENDORS;

export interface Family {
    name: string;
    architecture: Architecture;
    url?: string;
    devices: Record<string, Device>;
}

// Postfix of the nextpnr command, e.g. nextpnr-ice40
export type Architecture = 'ecp5' | 'generic' | 'gowin' | 'ice40' | 'machxo2' | 'nexus';

export interface Device {
    name: string;
    device: string;
    packages: string[];
}

/* eslint-disable @typescript-eslint/naming-convention */

export const VENDORS = {
    'generic': {
        name: 'Generic',
        url: 'https://github.com/YosysHQ/nextpnr/blob/master/docs/generic.md',
        packages: {
            'generic': 'Generic'
        },
        families: {
            generic: {
                name: 'Generic',
                architecture: 'generic',
                devices: {
                    generic: {
                        name: 'Generic',
                        device: 'generic',
                        packages: ['generic']
                    }
                }
            }
        }
    },
    'gowin': {
        name: 'Gowin',
        url: 'https://gowinsemi.com',
        packages: {
            'LQ144': 'LQ144 (20 mm x 20 mm)',
            'QFN48': 'QFN48 (6 mm x 6 mm)',
            'QN48': 'QN48 (6 mm x 6 mm)',
            'QN48P': 'QN48P (6 mm x 6 mm)',
            'QN88': 'QN88 (10 mm x 10 mm)'
        },
        families: {
            littlebee: {
                name: 'LittleBee',
                architecture: 'gowin',
                url: 'https://www.gowinsemi.com/en/product/detail/46',
                devices: {
                    'gw1n-1': {
                        name: 'GW1N-1',
                        device: 'GW1N-1',
                        // NOTE: other packages are also listed on the Gowin website, but nextpnr does not appear to support it for this device
                        packages: ['QN48']
                    },
                    // NOTE: GW1N-1P5 and GW1N-2 are also listed on the Gowin website, but nextpnr does not appear to support these devices
                    'gw1n-4': {
                        name: 'GW1N-4',
                        device: 'GW1N-4',
                        // NOTE: other packages are also listed on the Gowin website, but nextpnr does not appear to support it for this device
                        packages: ['LQ144']
                    },
                    // GW1N-9 is also listed on the Gowin website, but nextpnr does not appear to support this device
                    // GW1NR-1, GW1NR-2 and GW1NR-4 are also listed on the Gowin website, but nextpnr does not appear to support these devices
                    'gw1nr-9': {
                        name: 'GW1NR-9',
                        device: 'GW1NR-9',
                        // NOTE: other packages are also listed on the Gowin website, but nextpnr does not appear to support it for this device
                        packages: ['QN88']
                    },
                    // NOTE: GW1NS-2 is also listed on the Gowin website, but nextpnr does not appear to support this device
                    'gw1ns-2c': {
                        name: 'GW1NS-2C',
                        device: 'GW1NS-2C',
                        // NOTE: other packages are also listed on the Gowin website, but nextpnr does not appear to support it for this device
                        packages: ['QN48']
                    },
                    // NOTE: GW1NS-4 and GW1NS-4C are also listed on the Gowin website, but nextpnr does not appear to support these devices
                    'gw1nz-1': {
                        name: 'GW1NZ-1',
                        device: 'GW1NZ-1',
                        // NOTE: other packages are also listed on the Gowin website, but nextpnr does not appear to support it for this devi
                        packages: ['QFN48']
                    },
                    'gw1nsr-4c': {
                        name: 'GW1NSR-4C',
                        device: 'GW1NSR-4C',
                        // NOTE: other packages are also listed on the Gowin website, but nextpnr does not appear to support it for this device
                        packages: ['QN48P']
                    }
                }
            }
        }
    },
    'lattice': {
        name: 'Lattice',
        url: 'https://www.latticesemi.com',
        packages: {
            'ASG256': 'ASG256 (9 x 9 mm)',
            'BBG484': 'BBG484 (19 x 19 mm)',
            'BFG484': 'BFG484 (23 x 23 mm)',
            'bg121': '121-ball caBGA (9 x 9 mm)',
            'bg121:4k': '121-ball caBGA (9 x 9 mm)',
            'caBGA256': '256-ball caBGA (14 x 14 mm)',
            'caBGA381': '381-ball caBGA (17 x 17 mm)',
            'caBGA400': '400-ball caBGA (17 x 17 mm)',
            'caBGA554': '554-ball caBGA (23 x 23 mm)',
            'caBGA756': '756-ball caBGA (27 x 27 mm)',
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
            'QFN32': '32-pin QFN (5 x 5 mm)',
            'QFN48': '48-pin QFN (7 x 7 mm)',
            'QFN72': '72-pin QFN (10 x 10 mm)',
            'qn32': '32-pin QFN (5 x 5 mm)',
            'qn84': '84-pin QFNS (7 x 7 mm)',
            'swg16tr': '16-ball WLCSP (1.40 x 1.48 mm)',
            'tq144': '144-pin TQFP (20 x 20 mm)',
            'tq144:4k': '144-pin TQFP (20 x 20 mm)',
            'TQFP100': '100-pin TQFP (14 x 14 mm)',
            'TQFP144': '144-pin TQFP (20 x 20 mm)',
            'vq100': '100-pin VQFP (14 x 14 mm)'
        },
        families: {
            // TODO: the Nexus architecture probably needs full device names (https://github.com/YosysHQ/nextpnr/blob/master/docs/nexus.md)
            'certus-nx': {
                name: 'Certus-NX',
                architecture: 'nexus',
                url: 'https://www.latticesemi.com/Certus-NX',
                devices: {
                    // NOTE: LFD2NX-17 is also listed on the Lattice website, but nextpnr does not appear to support this device
                    'lfd2nx-40': {
                        name: 'LFD2NX-40',
                        device: 'LFD2NX-40',
                        // NOTE: csfBGA121 and caBGA196 are also listed on the Lattice website, but nextpnr does not appear to support it for this device
                        packages: ['caBGA256']
                    }
                }
            },
            'certuspro-nx': {
                name: 'CertusPro-NX',
                architecture: 'nexus',
                url: 'https://www.latticesemi.com/CertusPro-NX',
                devices: {
                    // NOTE: LFCPNX-50 is also listed on the Lattice website, but nextpnr does not appear to support this device
                    'lfcpnx-100': {
                        name: 'LFCPNX-100',
                        device: 'LFCPNX-100',
                        packages: ['ASG256', 'CBG256', 'BBG484', 'BFG484', 'LFG672']
                    }
                }
            },
            'crosslink-nx': {
                name: 'CrossLink-NX',
                architecture: 'nexus',
                url: 'https://www.latticesemi.com/CrossLink-NX',
                devices: {
                    'lifcl-17': {
                        name: 'LIFCL-17',
                        device: 'LIFCL-17',
                        // NOTE: WLCSP72 is also listed on the Lattice website, but nextpnr does not appear to support it for this device
                        packages: ['QFN72', 'csfBGA121', 'caBGA256']
                    },
                    // NOTE: LIFCL-33 is also listed on the Lattice website, but nextpnr does not appear to support this device
                    'lifcl-40': {
                        name: 'LIFCL-40',
                        device: 'LIFCL-40',
                        // NOTE: csfBGA121 and caBGA256 are also listed on the Lattice website, but nextpnr does not appear to support it for this device
                        packages: ['QFN72', 'csfBGA289', 'caBGA400']
                    }
                }
            },
            'ecp5': {
                name: 'ECP5 / ECP5-5G',
                architecture: 'ecp5',
                url: 'https://www.latticesemi.com/ECP5',
                devices: {
                    'lfe5u-12': {
                        name: 'LFE5U-12',
                        device: '12k',
                        // NOTE: TQFP144 is also listed on the Lattice website, but nextpnr does not appear to support it for this device
                        packages: ['csfBGA285', 'caBGA256', 'caBGA381']
                    },
                    'lfe5u-25': {
                        name: 'LFE5U-25',
                        device: '25k',
                        // NOTE: TQFP144 is also listed on the Lattice website, but nextpnr does not appear to support it for this device
                        packages: ['csfBGA285', 'caBGA256', 'caBGA381']
                    },
                    'lfe5u-45': {
                        name: 'LFE5U-45',
                        device: '45k',
                        // NOTE: TQFP144 is also listed on the Lattice website, but nextpnr does not appear to support it for this device
                        packages: ['csfBGA285', 'caBGA256', 'caBGA381', 'caBGA554']
                    },
                    'lfe5u-85': {
                        name: 'LFE5U-85',
                        device: '85k',
                        packages: ['csfBGA285', 'caBGA381', 'caBGA554', 'caBGA756']
                    },
                    'lfe5um-25': {
                        name: 'LFE5UM-25',
                        device: 'um-25k',
                        packages: ['csfBGA285', 'caBGA381']
                    },
                    'lfe5um-45': {
                        name: 'LFE5UM-45',
                        device: 'um-45k',
                        packages: ['csfBGA285', 'caBGA381', 'caBGA554']
                    },
                    'lfe5um-85': {
                        name: 'LFE5UM-85',
                        device: 'um-85k',
                        packages: ['csfBGA285', 'caBGA381', 'caBGA554', 'caBGA756']
                    },
                    'lfe5um5g-25': {
                        name: 'LFE5UM5G-25',
                        device: 'um5g-25k',
                        packages: ['csfBGA285', 'caBGA381']
                    },
                    'lfe5um5g-45': {
                        name: 'LFE5UM5G-45',
                        device: 'um5g-45k',
                        packages: ['csfBGA285', 'caBGA381', 'caBGA554']
                    },
                    'lfe5um5g-85': {
                        name: 'LFE5UM5G-85',
                        device: 'um5g-85k',
                        packages: ['csfBGA285', 'caBGA381', 'caBGA554', 'caBGA756']
                    }
                    // NOTE: ECP5 Automative Devices are also listed on the Lattice website, but nextpnr does not appear to support those devices
                }
            },
            'ice40': {
                name: 'iCE40 LP/HX',
                architecture: 'ice40',
                url: 'https://www.latticesemi.com/iCE40',
                devices: {
                    'lp384': {
                        name: 'LP384',
                        device: 'lp384',
                        packages: ['cm36', 'cm49', 'qn32']
                    },
                    // NOTE: LP640 is also listed on the Lattice website, but nextpnr does not appear to support this device
                    'lp1k': {
                        name: 'LP1K',
                        device: 'lp1k',
                        packages: ['swg16tr', 'cm36', 'cm49', 'cm81', 'cm121', 'qn84', 'cb81', 'cb121']
                    },
                    'lp4k': {
                        name: 'LP4K',
                        device: 'lp8k',
                        packages: ['cm81:4k', 'cm121:4k', 'cm225:4k']
                    },
                    'lp8k': {
                        name: 'LP8K',
                        device: 'lp8k',
                        packages: ['cm81', 'cm121', 'cm225']
                    },
                    'hx1k': {
                        name: 'HX1K',
                        device: 'hx1k',
                        packages: ['cb132', 'vq100', 'tq144']
                    },
                    'hx4k': {
                        name: 'HX4K',
                        device: 'hx8k',
                        packages: ['cb132:4k', 'tq144:4k', 'bg121:4k']
                    },
                    'hx8k': {
                        name: 'HX8K',
                        device: 'hx8k',
                        packages: ['cm225', 'cb132', 'bg121', 'ct256']
                    }
                }
            },
            machxo2: {
                name: 'MachXO2',
                architecture: 'machxo2',
                url: 'https://www.latticesemi.com/MachXO2',
                devices: {
                    'xo2-256': {
                        name: 'XO2-256',
                        device: '256',
                        // NOTE: other packages are also listed on the Lattice website, but nextpnr does not appear to support it for this device
                        packages: ['QFN32']
                    },
                    'xo2-640': {
                        name: 'XO2-640',
                        device: '640',
                        // NOTE: other packages are also listed on the Lattice website, but nextpnr does not appear to support it for this device
                        packages: ['QFN48']
                    },
                    // NOTE: XO2-640U is also listed on the Lattice website, but nextpnr does not appear to support this device
                    'xo2-1200': {
                        name: 'XO2-1200',
                        device: '1200',
                        // NOTE: other packages are also listed on the Lattice website, but nextpnr does not appear to support it for this device
                        packages: ['QFN32']
                    },
                    // NOTE: XO2-1200U is also listed on the Lattice website, but nextpnr does not appear to support this device
                    'xo2-2000': {
                        name: 'XO2-2000',
                        device: '2000',
                        // NOTE: other packages are also listed on the Lattice website, but nextpnr does not appear to support it for this device
                        packages: ['TQFP100']
                    },
                    // NOTE: XO2-2000U is also listed on the Lattice website, but nextpnr does not appear to support this device
                    'xo2-4000': {
                        name: 'XO2-4000',
                        device: '4000',
                        // NOTE: other packages are also listed on the Lattice website, but nextpnr does not appear to support it for this device
                        packages: ['TQFP144']
                    },
                    'xo2-7000': {
                        name: 'XO2-7000',
                        device: '7000',
                        // NOTE: other packages are also listed on the Lattice website, but nextpnr does not appear to support it for this device
                        packages: ['TQFP144']
                    },
                }
            }
        }
    }
} satisfies Record<string, Vendor>;

/* eslint-enable @typescript-eslint/naming-convention */
