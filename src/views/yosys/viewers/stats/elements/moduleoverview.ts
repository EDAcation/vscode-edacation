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
        return this.getAvailableOptions()[0] ?? 'name';
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
                const root = this.modules[0];
                const val = root?.globalChildren.get(item)?.toString() ?? '-';
                return {elem: val};
            }
            default: {
                const countVar = this.getSetting('count-recursive') ? 'globalStats' : 'stats';
                const root = this.modules[0];
                if (!root) return {elem: '-'};

                const statsContainer = (item as unknown as Record<string, Record<string, number>>)[countVar];
                const statKey = option;
                let stat1 = statsContainer ? statsContainer[statKey as unknown as string] : 0;
                if (stat1 === undefined) stat1 = 0;
                if (this.getSetting('count-all')) {
                    const factor = root.globalChildren.get(item) || 1;
                    stat1 *= factor;
                }

                const rootStats = root.globalStats as unknown as Record<string, number>;
                const stat2 = rootStats[statKey as unknown as string] ?? 0;

                const val = `${stat1}/${stat2} (${getPercentage(stat1, stat2)}%)`;
                return {elem: val};
            }
        }
    }
}
