import {type Module, type ModuleStatId, getModuleStatIds, getModuleStatName} from '../modules';

import {type DataGridCell, InteractiveDataGrid} from './datagrid';
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
    private actualRoot2: HTMLElement;
    private breadcrumbHeader: HTMLParagraphElement;

    private moduleBreadcrumbs: Module[];

    constructor(initModule: Module) {
        super();

        this.breadcrumbHeader = document.createElement('p');
        this.actualRoot2 = document.createElement('div');
        this.actualRoot2.appendChild(this.breadcrumbHeader);
        this.actualRoot2.appendChild(super.element);

        this.moduleBreadcrumbs = [initModule];

        this.update();
    }

    override get element(): HTMLElement {
        return this.actualRoot2;
    }

    get curModule(): Module {
        return this.moduleBreadcrumbs[this.moduleBreadcrumbs.length - 1];
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

        // Update grid
        this.reset(false, true);
        this.addRowItem({type: 'current'});
        for (const prim of this.curModule.primitives.keys()) {
            this.addRowItem({type: 'primitive', primitive: prim});
        }
        for (const subCircuit of this.curModule.children.keys()) {
            this.addRowItem({type: 'child', module: subCircuit});
        }

        this.render();
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
            case 'primitive':
                return this.getValuePrimitive(item, option);
            case 'child':
                return this.getValueChild(item, option);
        }
    }

    private getValueCurrent(_item: ModuleExplorerRowCurrent, option: ModuleExplorerOptions): DataGridCell {
        switch (option) {
            case 'name':
                return '< Current Module >';
            case 'count':
                return '-';
            default:
                return this.curModule.globalStats[option].toString();
        }
    }

    private getValuePrimitive(item: ModuleExplorerRowPrimitive, option: ModuleExplorerOptions): DataGridCell {
        switch (option) {
            case 'name':
                return item.primitive;
            case 'count':
                return this.curModule.primitives.get(item.primitive)?.toString() ?? '-';
            default:
                return '';
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
                return link;
            }
            case 'count':
                return this.curModule.children.get(item.module)?.toString() ?? '-';
            default: {
                const stat1 = item.module.globalStats[option];
                const stat2 = this.curModule.globalStats[option];

                return `${stat1} (${getPercentage(stat1, stat2)}%)`;
            }
        }
    }
}
