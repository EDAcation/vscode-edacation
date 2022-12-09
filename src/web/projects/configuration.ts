type Target = 'ice40' | 'ecp5';

export interface ProjectConfiguration {
    target?: Target;
    package?: string;

    yosys?: {
        useDefaultArguments?: boolean;
        arguments?: string[];
    };

    nextpnr?: {
        useDefaultArguments?: boolean;
        arguments?: string[];
    };
}

export const DEFAULT_CONFIGURATION: ProjectConfiguration = {
    target: 'ecp5',

    yosys: {},

    nextpnr: {}
};

const test = {
    vendors: [
        {
            name: 'Lattice',
            families: [
                {
                    name: 'ecp5',
                    devices: [
                        {
                            name: 'LAE5UM 25F',
                            packages: ['cabga381', 'csfbga285']
                        }
                    ]
                }
            ]
        }
    ]
};
