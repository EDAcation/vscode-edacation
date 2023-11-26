import {type Module} from '../modules';

import {type DataGridCell, type DatagridSetting, InteractiveDataGrid, type InteractiveDatagridConfig} from './datagrid';
import {getPercentage} from './util';

// TODO: typing for primitives (needs exhaustive list)
type PrimitivesOverviewOptions = 'name' | 'count' | string;

export class PrimitivesOverviewGrid extends InteractiveDataGrid<Module, PrimitivesOverviewOptions> {
    private modules: Module[];

    constructor(modules: Module[]) {
        super();

        this.modules = modules;

        this.update();

        const prims = this.getAvailableOptions();
        for (let i = 0; i < prims.length && i < 5; i++) {
            this.addCol(prims[i]);
        }
    }

    getIdentifier(): string {
        return 'primitives-overview';
    }

    // Config get/set overrides to prevent column back-ups and restores
    getConfig(): InteractiveDatagridConfig<PrimitivesOverviewOptions> {
        const conf = super.getConfig();
        conf.columns = [];
        return conf;
    }
    setConfig(config?: InteractiveDatagridConfig<PrimitivesOverviewOptions> | undefined): void {
        if (config) {
            config.columns = null;
        }
        super.setConfig(config);
    }

    protected getSettings(): DatagridSetting[] {
        return [
            {id: 'count-recursive', text: 'Count submodules recursively', default: true},
            {id: 'count-all', text: 'Count all module occurences', default: false}
        ];
    }

    protected getDefaultOptions(): PrimitivesOverviewOptions[] {
        return ['name', 'count'];
    }

    protected getAvailableOptions(): PrimitivesOverviewOptions[] {
        return Array.from(this.modules[0].globalPrimitives.keys());
    }

    protected getNewOption(): PrimitivesOverviewOptions {
        return this.getAvailableOptions()[0];
    }

    protected getOptionName(option: string): string {
        if (option === 'name') {
            return 'Module name';
        } else if (option === 'count') {
            return 'Count';
        }
        return '$' + option;
    }

    protected getValue(item: Module, option: PrimitivesOverviewOptions): DataGridCell {
        if (option === 'name') {
            return item.name;
        } else if (option === 'count') {
            return this.modules[0].globalChildren.get(item)?.toString() ?? '-';
        }

        const totalCount = this.modules[0].globalPrimitives.get(option);

        const countVar = this.getSetting('count-recursive') ? 'globalPrimitives' : 'primitives';
        let count = item[countVar].get(option);
        if (count === undefined || !totalCount) {
            return '-';
        }

        if (this.getSetting('count-all')) {
            count *= this.modules[0].globalChildren.get(item) || 1;
        }

        return `${count} (${getPercentage(count, totalCount)}%)`;
    }

    override update() {
        this.reset(false, true);

        for (const module of this.modules) {
            this.addRowItem(module);
        }

        this.render();
    }
}
