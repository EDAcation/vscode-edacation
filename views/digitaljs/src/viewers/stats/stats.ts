import type {View} from '../../main';
import type {ForeignViewMessage} from '../../messages';
import type {YosysStats} from '../../types';
import {BaseViewer} from '../base';

import {ModuleExplorerGrid, ModuleNavigator, ModuleOverviewGrid} from './elements';
import {type Module, type ModuleStatId, buildModuleTree} from './modules';

interface OverviewGridSettings {
    columns: ModuleStatId[];
}

export class StatsViewer extends BaseViewer<YosysStats> {
    handleForeignViewMessage(message: ForeignViewMessage): void {
        if (message.type === 'moduleFocus') {
            // Focus explorer navigator according to breadcrumbs from djs viewer
            this.explorerNavigator.navigateSplice(0);
            let lastModule: Module = this.modules[0];
            for (const moduleName of message.breadcrumbs) {
                const module = this.getModule(moduleName);
                if (!module) {
                    throw new Error(`Unknown module: ${moduleName}`);
                }
                this.explorerNavigator.navigateModule(module);

                lastModule = module;
            }

            this.renderExplorer(lastModule);
        }
    }

    private modules: Module[];

    private overviewGrid: ModuleOverviewGrid;

    private explorerNavigator: ModuleNavigator;
    private explorerGrid: ModuleExplorerGrid;

    constructor(mainView: View, initData: YosysStats) {
        super(mainView, initData);

        this.modules = buildModuleTree(this.data.modules);
        if (!this.modules) {
            throw new Error('No circuit modules found to display!');
        }

        this.overviewGrid = new ModuleOverviewGrid(this.modules);
        this.overviewGrid.addEventListener('gridHeadersUpdate', (data) => {
            this.storeValue('yosys-stats-overview-settings', {columns: data.newHeaders});
        });
        this.getValue('yosys-stats-overview-settings').then((value) => {
            const settings = Object.keys(value).length ? (value as OverviewGridSettings) : {columns: []};
            for (const col of settings.columns) {
                this.overviewGrid.addCol(col);
            }
        });

        this.explorerNavigator = new ModuleNavigator(this.modules[0]);
        // this.explorerNavigator.addEventListener('explorerFocusUpdate', (event) => {
        //     this.renderExplorer(event.data.module);
        // });

        this.explorerGrid = new ModuleExplorerGrid(this.modules[0]);
        // this.explorerGrid.addEventListener('explorerModuleClicked', (event) => {
        //     this.explorerNavigator.navigateModule(event.data.module);
        //     this.renderExplorer(event.data.module);
        // });
    }

    private getModule(name: string): Module | null {
        for (const module of this.modules) {
            if (module.name === name) {
                return module;
            }
        }
        return null;
    }

    private renderExplorer(module: Module) {
        this.explorerGrid.setModule(module);
        this.explorerGrid.render();

        this.explorerNavigator.render();
    }

    async render(isUpdate: boolean): Promise<void> {
        if (isUpdate) {
            // All elements are dynamically resized so we don't need to redraw
            return;
        }
        this.root.replaceChildren();

        // ** Overview Table **
        const overviewHeader = document.createElement('h2');
        overviewHeader.textContent = 'Circuit overview';
        this.root.appendChild(overviewHeader);

        this.overviewGrid.render();
        this.root.appendChild(this.overviewGrid.element);

        // ** Divider **
        this.root.appendChild(document.createElement('br'));
        this.root.appendChild(document.createElement('vscode-divider'));

        // ** Circuit explorer **
        const explorerHeader = document.createElement('h2');
        explorerHeader.textContent = 'Circuit explorer';
        this.root.appendChild(explorerHeader);

        this.explorerNavigator.render();
        this.root.appendChild(this.explorerNavigator.element);
        this.explorerGrid.render();
        this.root.appendChild(this.explorerGrid.element);
    }
}
