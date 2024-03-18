import {getElementGroup} from 'edacation';

import {type Module, getTotalPrimCounts} from '../modules';

import {type DataGridCell, type DatagridSetting, InteractiveDataGrid, type InteractiveDatagridConfig} from './datagrid';
import {getPercentage} from './util';

// TODO: typing for primitives (needs exhaustive list)
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
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
        return this.modules[0].globalPrimitives.map((prim) => prim.name);
    }

    protected getNewOption(): PrimitivesOverviewOptions {
        return this.getAvailableOptions()[0];
    }

    protected getOptionName(option: PrimitivesOverviewOptions): string {
        if (option === 'name') {
            return 'Module name';
        } else if (option === 'count') {
            return 'Count';
        }
        return '$' + option;
    }

    protected getValue(item: Module, option: PrimitivesOverviewOptions): DataGridCell {
        if (option === 'name') {
            return {elem: item.name};
        } else if (option === 'count') {
            const val = this.modules[0].globalChildren.get(item)?.toString() ?? '-';
            return {elem: val};
        }

        const totalCount = getTotalPrimCounts(this.modules[0].findPrimitives({name: option}, true));

        const isGlobal = this.getSetting('count-recursive');
        const count = getTotalPrimCounts(item.findPrimitives({name: option}, isGlobal));
        if (!count || !totalCount) {
            return {elem: '-'};
        }

        if (this.getSetting('count-all')) {
            const factor = this.modules[0].globalChildren.get(item) || 1;
            count.cells *= factor;
            count.bits *= factor;
        }

        const cellShare = getPercentage(count.cells, totalCount.cells);
        const bitShare = getPercentage(count.bits, totalCount.bits);

        const val = `cells: ${count.cells} (${cellShare}%) / bits: ${count.bits} (${bitShare}%)`;

        // Detect whether this is the first row. Bit hacky, but it works fine.
        if (item === this.modules[0]) {
            const color = getElementGroup(option)?.color;
            return {elem: val, borderColor: color, borders: ['top']};
        }
        return {elem: val};
    }

    override update() {
        this.reset(false, true);

        for (const module of this.modules) {
            this.addRowItem(module);
        }

        this.render();
    }
}
