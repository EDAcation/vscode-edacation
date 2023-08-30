import type {View} from '../../main';
import type {ForeignViewMessage} from '../../messages';
import type {YosysStats} from '../../types';
import {BaseViewer} from '../base';

import {ModuleExplorerGrid, ModuleNavigator, ModuleOverviewGrid} from './elements';
import {type Module, buildModuleTree} from './modules';

export class StatsViewer extends BaseViewer<YosysStats> {
    handleForeignViewMessage(message: ForeignViewMessage): void {
        console.log('Foreign message:');
        console.log(message);
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

        this.explorerNavigator = new ModuleNavigator(this.modules[0]);
        this.explorerNavigator.addEventListener('explorerFocusUpdate', (event) => {
            this.renderExplorer(event.data.module);
        });

        this.explorerGrid = new ModuleExplorerGrid(this.modules[0]);
        this.explorerGrid.addEventListener('explorerModuleClicked', (event) => {
            this.explorerNavigator.navigateModule(event.data.module);
            this.renderExplorer(event.data.module);
        });
    }

    private renderExplorer(module: Module) {
        this.explorerGrid.setModule(module);
        this.explorerGrid.render();

        this.explorerNavigator.render();
    }

    async render(): Promise<void> {
        this.root.replaceChildren();

        // ** Overview Table **
        const overviewHeader = document.createElement('h2');
        overviewHeader.textContent = 'Circuit overview';
        this.root.appendChild(overviewHeader);

        const btn = document.createElement('button');
        btn.textContent = 'Click for more columns';
        btn.addEventListener('click', (_ev) => {
            this.overviewGrid.addColumn();
        });
        this.root.appendChild(btn);

        this.root.appendChild(document.createElement('br'));

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

        // ** Other stuff **
        const button = document.createElement('button');
        button.textContent = 'Click for broadcast';
        button.addEventListener('click', (_ev) => {
            this.broadcastMessage({
                type: 'moduleFocus',
                module: 'test_module_goes_here'
            });
        });
        this.root.appendChild(button);
    }
}
