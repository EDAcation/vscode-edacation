import {type Module} from '../modules';

import {type DataGridCell, InteractiveDataGrid} from './datagrid';
import {getPercentage} from './util';

// TODO: typing for primitives (needs exhaustive list)
type PrimitivesOverviewOptions = 'name' | string;

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

    protected getDefaultOptions(): PrimitivesOverviewOptions[] {
        return ['name'];
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
        }
        return '$' + option;
    }

    protected getValue(item: Module, option: PrimitivesOverviewOptions): DataGridCell {
        if (option === 'name') {
            return item.name;
        }

        const count = item.globalPrimitives.get(option);
        const totalCount = this.modules[0].globalPrimitives.get(option);
        if (count === undefined || !totalCount) {
            return '-';
        }

        return `${count} (${getPercentage(count, totalCount)}%)`;
    }

    update() {
        this.reset(false, true);

        for (const module of this.modules) {
            this.addRowItem(module);
        }

        this.render();
    }
}
