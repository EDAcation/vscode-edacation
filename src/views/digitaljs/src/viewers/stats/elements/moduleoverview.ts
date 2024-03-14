import {type Module, type ModuleStatId, getModuleStatIds, getModuleStatName} from '../modules';

import {type DataGridCell, type DatagridSetting, InteractiveDataGrid} from './datagrid';
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

    getIdentifier(): string {
        return 'module-overview';
    }

    protected getSettings(): DatagridSetting[] {
        return [
            {id: 'count-recursive', text: 'Count submodules recursively', default: true},
            {id: 'count-all', text: 'Count all module occurences', default: false}
        ];
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
                return {elem: item.name};
            case 'count': {
                const val = this.modules[0].globalChildren.get(item)?.toString() ?? '-';
                return {elem: val};
            }
            default: {
                const countVar = this.getSetting('count-recursive') ? 'globalStats' : 'stats';
                let stat1 = item[countVar][option];
                if (this.getSetting('count-all')) {
                    stat1 *= this.modules[0].globalChildren.get(item) || 1;
                }

                const stat2 = this.modules[0].globalStats[option];

                const val = `${stat1}/${stat2} (${getPercentage(stat1, stat2)}%)`;
                return {elem: val};
            }
        }
    }
}
