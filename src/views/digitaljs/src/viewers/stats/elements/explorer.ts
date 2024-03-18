import {getElementGroup} from 'edacation';

import {type Module, type ModuleStatId, getModuleStatIds, getModuleStatName, getTotalPrimCounts} from '../modules';

import {type DataGridCell, type DatagridSetting, InteractiveDataGrid} from './datagrid';
import {getPercentage} from './util';

interface ModuleExplorerRowCurrent {
    type: 'current';
}
interface ModuleExplorerRowPrimitive {
    type: 'primitive';
    primitive: string;
}
interface ModuleExplorerRowChild {
    type: 'child';
    module: Module;
}
type ModuleExplorerRowItems = ModuleExplorerRowCurrent | ModuleExplorerRowPrimitive | ModuleExplorerRowChild;
type ModuleExplorerOptions = 'name' | 'count' | ModuleStatId;

export class ModuleExplorerGrid extends InteractiveDataGrid<ModuleExplorerRowItems, ModuleExplorerOptions> {
    private breadcrumbHeader: HTMLParagraphElement;

    private moduleBreadcrumbs: Module[];

    constructor(initModule: Module) {
        super();

        this.breadcrumbHeader = document.createElement('p');

        this.moduleBreadcrumbs = [initModule];

        this.update();
    }

    getIdentifier(): string {
        return 'module-explorer';
    }

    get curModule(): Module {
        return this.moduleBreadcrumbs[this.moduleBreadcrumbs.length - 1];
    }

    protected override getGridHeaderElement(): HTMLElement {
        const headerElem = super.getGridHeaderElement();

        headerElem.appendChild(this.breadcrumbHeader);

        return headerElem;
    }

    navigateSplice(i: number) {
        if (i === 0) {
            throw new Error('Cannot navigate above top-level module!');
        }
        this.moduleBreadcrumbs.splice(i);
    }

    navigate(module: Module) {
        if (Array.from(this.curModule.children.keys()).indexOf(module) === -1) {
            throw new Error(`Cannot navigate to module "${module.name}": not a child of "${this.curModule.name}"`);
        }
        this.moduleBreadcrumbs.push(module);
    }

    update() {
        // Update breadcrumbs
        this.breadcrumbHeader.replaceChildren();

        for (let i = 0; i < this.moduleBreadcrumbs.length; i++) {
            const link = document.createElement('vscode-link');
            link.textContent = this.moduleBreadcrumbs[i].name;
            link.addEventListener('click', (_ev) => {
                this.navigateSplice(i + 1);
                this.update();
            });
            this.breadcrumbHeader.append(link);

            if (i != this.moduleBreadcrumbs.length - 1) {
                this.breadcrumbHeader.append(' > ');
            }
        }

        // Get unique primitive names (so no diff bit widths) and sort by their element group
        let primNames = this.curModule.primitives.map((prim) => prim.name);
        primNames = primNames.filter((val, ind) => primNames.indexOf(val) === ind);
        primNames.sort((p1, p2) => {
            const order1 = getElementGroup(p1)?.sorting ?? Infinity;
            const order2 = getElementGroup(p2)?.sorting ?? Infinity;
            return [order1, p1] > [order2, p2] ? 1 : -1;
        });

        // Update grid
        this.reset(false, true);
        this.addRowItem({type: 'current'});
        for (const subCircuit of this.curModule.children.keys()) {
            this.addRowItem({type: 'child', module: subCircuit});
        }
        for (const prim of primNames) {
            this.addRowItem({type: 'primitive', primitive: prim});
        }

        super.update();
    }

    protected getSettings(): DatagridSetting[] {
        return [{id: 'count-all', text: 'Count all module occurences', default: false}];
    }

    protected getDefaultOptions(): ModuleExplorerOptions[] {
        return ['name', 'count'];
    }

    protected getAvailableOptions(): ModuleExplorerOptions[] {
        return getModuleStatIds();
    }

    protected getNewOption(): ModuleExplorerOptions {
        return this.getAvailableOptions()[0];
    }

    protected getOptionName(option: ModuleExplorerOptions): string {
        switch (option) {
            case 'name':
                return 'Module name';
            case 'count':
                return 'Count';
            default:
                return getModuleStatName(option);
        }
    }

    protected getValue(item: ModuleExplorerRowItems, option: ModuleExplorerOptions): DataGridCell {
        switch (item.type) {
            case 'current':
                return this.getValueCurrent(item, option);
            case 'primitive': {
                return this.getValuePrimitive(item, option);
            }
            case 'child':
                return this.getValueChild(item, option);
        }
    }

    private getValueCurrent(_item: ModuleExplorerRowCurrent, option: ModuleExplorerOptions): DataGridCell {
        switch (option) {
            case 'name':
                return {elem: '< Current Module >'};
            case 'count':
                return {elem: '-'};
            default:
                return {elem: this.curModule.globalStats[option].toString()};
        }
    }

    private getValuePrimitive(item: ModuleExplorerRowPrimitive, option: ModuleExplorerOptions): DataGridCell {
        switch (option) {
            case 'name': {
                // Only color left border of primitive's name cell (first column)
                const color = getElementGroup(item.primitive)?.color;
                return {elem: '$' + item.primitive, borderColor: color, borders: ['left']};
            }
            case 'count': {
                const count = getTotalPrimCounts(this.curModule.findPrimitives({name: item.primitive}, false));
                return {elem: `${count.cells} (${count.bits} total bits)`};
            }
            default:
                return {elem: ''};
        }
    }

    private getValueChild(item: ModuleExplorerRowChild, option: ModuleExplorerOptions): DataGridCell {
        switch (option) {
            case 'name': {
                const link = document.createElement('vscode-link');
                link.textContent = item.module.name;
                link.addEventListener('click', (_ev) => {
                    this.navigate(item.module);
                    this.update();
                });
                return {elem: link};
            }
            case 'count':
                return {elem: this.curModule.children.get(item.module)?.toString() ?? '-'};
            default: {
                let stat1 = item.module.globalStats[option];
                if (this.getSetting('count-all')) {
                    stat1 *= this.curModule.children.get(item.module) || 1;
                }

                const stat2 = this.curModule.globalStats[option];

                return {elem: `${stat1} (${getPercentage(stat1, stat2)}%)`};
            }
        }
    }
}
