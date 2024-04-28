import {getElementGroups} from 'edacation';

import {DataGrid} from './datagrid';

export class ColorOverviewList extends DataGrid<Record<string, never>> {
    constructor() {
        super(['color', 'name']);

        const groups = Array.from(new Set(getElementGroups().values()));
        groups.sort((g1, g2) => {
            const order1 = g1.sorting ?? Infinity;
            const order2 = g2.sorting ?? Infinity;
            return order1 > order2 ? 1 : -1;
        });

        for (const group of groups) {
            this.addRow([
                {
                    elem: group.color,
                    borderColor: group.color,
                    borders: ['left']
                },
                {
                    elem: group.name
                }
            ]);
        }
    }
}
