import type {View} from '../../main';
import type {ForeignViewMessage} from '../../messages';
import type {YosysStats} from '../../types';
import {BaseViewer} from '../base';

import {ModuleExplorerGrid, ModuleOverviewGrid, PrimitivesOverviewGrid, TabsContainer} from './elements';
import {ColorOverviewList} from './elements/colors';
import type {InteractiveDataGrid, InteractiveDatagridConfig} from './elements/datagrid';
import {type Module, buildModuleTree} from './modules';

export class StatsViewer extends BaseViewer<YosysStats> {
    private modules: Module[];

    private tabsContainer: TabsContainer;

    private moduleOverview: ModuleOverviewGrid;
    private moduleExplorer: ModuleExplorerGrid;
    private primitivesOverview: PrimitivesOverviewGrid;
    private colorsList: ColorOverviewList;

    constructor(mainView: View, initData: YosysStats) {
        super(mainView, initData);

        this.modules = buildModuleTree(this.data.modules);
        if (!this.modules) {
            throw new Error('No circuit modules found to display!');
        }

        this.moduleOverview = new ModuleOverviewGrid(this.modules);
        this.setupConfigStore(this.moduleOverview);

        this.moduleExplorer = new ModuleExplorerGrid(this.modules[0]);
        this.setupConfigStore(this.moduleExplorer);

        this.primitivesOverview = new PrimitivesOverviewGrid(this.modules);
        this.setupConfigStore(this.primitivesOverview);

        this.colorsList = new ColorOverviewList();

        this.tabsContainer = new TabsContainer([
            {id: 'overview', title: 'Overview', element: this.moduleOverview},
            {id: 'explorer', title: 'Explorer', element: this.moduleExplorer},
            {id: 'primitives', title: 'Primitives', element: this.primitivesOverview},
            {id: 'colors', title: 'Element Colors', element: this.colorsList}
        ]);
    }

    handleForeignViewMessage(message: ForeignViewMessage): void {
        if (message.type === 'moduleFocus') {
            // Focus explorer navigator according to breadcrumbs from djs viewer
            this.moduleExplorer.navigateSplice(1);
            for (const moduleName of message.breadcrumbs) {
                const module = this.getModule(moduleName);
                if (!module) {
                    throw new Error(`Unknown module: ${moduleName}`);
                }
                this.moduleExplorer.navigate(module);
            }

            this.moduleExplorer.update();

            this.tabsContainer.focusTab('explorer');
        }
    }

    private setupConfigStore<K>(element: InteractiveDataGrid<unknown, K>) {
        const storeId = `yosys.stats.${element.getIdentifier()}.settings`;

        // Register callbacks for config back-up
        element.addEventListener('gridConfigUpdate', (event) => this.storeValue(storeId, event.config));

        // Restore initial config
        this.getValue(storeId).then((value) => {
            element.setConfig(value as InteractiveDatagridConfig<K>);
        });
    }

    private getModule(name: string): Module | null {
        for (const module of this.modules) {
            if (module.name === name) {
                return module;
            }
        }
        return null;
    }

    async render(isUpdate: boolean): Promise<void> {
        if (isUpdate) {
            // All elements are dynamically resized so we don't need to redraw
            return;
        }
        this.root.replaceChildren();

        const header = document.createElement('h1');
        header.textContent = 'Module Statistics';
        this.root.appendChild(header);

        const tabsElem = this.tabsContainer.element;
        tabsElem.style.height = '100%';

        this.root.appendChild(tabsElem);
        this.tabsContainer.render();
    }
}
