import type {ProjectConfiguration} from './configuration';

export interface Project {
    name: string;
    inputFiles: string[];
    outputFiles: string[];
    configuration: ProjectConfiguration;
}
