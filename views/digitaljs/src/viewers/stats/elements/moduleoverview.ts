import {type Module, type ModuleStatId, getModuleStatIds, getModuleStatName} from '../modules';

import {type DataGridCell, InteractiveDataGrid} from './datagrid';
import {getPercentage} from './util';

type ModuleOverviewOptions = 'name' | 'count' | ModuleStatId;

export class ModuleOverviewGrid extends InteractiveDataGrid<Module, ModuleOverviewOptions> {
    private modules: Module[];

    constructor(modules: Module[]) {
        super();

        this.modules = modules;

        for (const module of modules) {
            this.addRowItem(module);
        }
    }

    protected getDefaultOptions(): ModuleOverviewOptions[] {
        return ['name', 'count'];
    }

    protected getAvailableOptions(): ModuleOverviewOptions[] {
        return getModuleStatIds();
    }

    protected getNewOption(): ModuleOverviewOptions {
        return this.getAvailableOptions()[0];
    }

    protected getOptionName(option: ModuleOverviewOptions): string {
        switch (option) {
            case 'name':
                return 'Module name';
            case 'count':
                return 'Count';
            default:
                return getModuleStatName(option);
        }
    }

    protected getValue(item: Module, option: ModuleOverviewOptions): DataGridCell {
        switch (option) {
            case 'name':
                return item.name;
            case 'count':
                return this.modules[0].globalChildren.get(item)?.toString() ?? '-';
            default: {
                const stat1 = item.globalStats[option];
                const stat2 = this.modules[0].globalStats[option];

                return `${stat1}/${stat2} (${getPercentage(stat1, stat2)}%)`;
            }
        }
    }
}
