import {Architecture} from './devices';

export interface ProjectConfiguration {
    targets: ProjectTarget[];

    yosys?: YosysConfiguration;
    nextpnr?: NextpnrConfiguration;
}
export interface ProjectTarget {
    architecture: Architecture;
    package: string;

    yosys?: YosysTargetConfiguration;
    nextpnr?: NextpnrTargetConfiguration;
}

export interface YosysConfiguration {
    useGeneratedCommands?: boolean;
    commands?: string[];
}

export interface YosysTargetConfiguration extends YosysConfiguration {
    useDefaultCommands?: boolean;
}

export interface NextpnrConfiguration {
    useGeneratedArguments?: boolean;
    useDefaultArguments?: boolean;
    arguments?: string[];
}
export interface NextpnrTargetConfiguration extends NextpnrConfiguration {
    useDefaultArguments?: boolean;
}

export const DEFAULT_CONFIGURATION: ProjectConfiguration = {
    targets: [
        {
            architecture: 'ecp5',
            package: ''
        }
    ]
};
