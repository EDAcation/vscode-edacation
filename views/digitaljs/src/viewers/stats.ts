// import type {DataGrid} from '@vscode/webview-ui-toolkit';
import type {View} from '../main';
import type {ForeignViewMessage} from '../messages';
import type {YosysModuleStats, YosysStats} from '../types';

import {BaseViewer} from './base';

type DataGridRow = (Node | string)[];

class DataGrid {
    private rootElem: HTMLElement;

    constructor(headers: string[] = []) {
        this.rootElem = document.createElement('vscode-data-grid');

        this.setHeaders(headers);
    }

    get element(): HTMLElement {
        return this.rootElem;
    }

    setHeaders(headers: string[]) {
        let headerElem = this.rootElem.children.item(0);
        if (!headerElem) {
            headerElem = document.createElement('vscode-data-grid-row');
            headerElem.setAttribute('row-type', 'header');
            this.rootElem.appendChild(headerElem);
        }

        headerElem.replaceChildren();
        for (let i = 0; i < headers.length; i++) {
            const cell = document.createElement('vscode-data-grid-cell');
            cell.setAttribute('cell-type', 'columnheader');
            cell.setAttribute('grid-column', (i + 1).toString());
            cell.innerText = headers[i];
            headerElem.appendChild(cell);
        }
    }

    clearRows() {
        for (const child of Array.from(this.rootElem.children).slice(1)) {
            child.remove();
        }
    }

    addRows(rows: DataGridRow[]) {
        for (const row of rows) {
            this.addRow(row);
        }
    }

    addRow(cells: DataGridRow) {
        const row = document.createElement('vscode-data-grid-row');
        for (let i = 0; i < cells.length; i++) {
            const cell = document.createElement('vscode-data-grid-cell');
            cell.setAttribute('grid-column', (i + 1).toString());
            cell.append(cells[i]);
            row.appendChild(cell);
        }
        this.rootElem.appendChild(row);
    }
}

interface ModuleStats {
    [index: string]: number;
    memoryCount: number;
    memoryBitCount: number;
    processCount: number;
    cellCount: number;
}

class Module {
    private _children: Map<Module, number>;
    private parents: Set<Module>;
    private primitiveModules: Map<string, number>;

    public readonly name: string;
    public readonly localStats: ModuleStats;
    private _globalStats: ModuleStats | null;

    constructor(name: string, stats: YosysModuleStats) {
        this._children = new Map();
        this.parents = new Set();
        this.primitiveModules = new Map();

        this.name = name;
        this.localStats = {
            memoryCount: stats.num_memories,
            memoryBitCount: stats.num_memory_bits,
            processCount: stats.num_processes,
            cellCount: stats.num_cells
        };
        this._globalStats = null;
    }

    get primitives(): Map<string, number> {
        return this.primitiveModules;
    }

    get children(): Map<Module, number> {
        return this._children;
    }

    get isTopLevel(): boolean {
        return this.parents.size === 0;
    }

    get globalStats(): ModuleStats {
        if (this._globalStats) {
            return this._globalStats;
        }

        this._globalStats = structuredClone(this.localStats);
        for (const [module, count] of this._children) {
            const moduleStats = module.globalStats;
            this._globalStats.memoryCount += count * moduleStats.memoryCount;
            this._globalStats.memoryBitCount += count * moduleStats.memoryBitCount;
            this._globalStats.cellCount += count * moduleStats.cellCount;
        }

        return this._globalStats;
    }

    addPrimitive(prim: string, count: number) {
        const curCount = this.primitiveModules.get(prim) || 0;
        this.primitiveModules.set(prim, curCount + count);
    }

    addChild(module: Module, count: number) {
        const curCount = this._children.get(module) || 0;
        this._children.set(module, curCount + count);
        module.addParent(this);
    }

    protected addParent(module: Module) {
        this.parents.add(module);
    }
}

const resolveModuleDeps = (name: string, stats: YosysModuleStats, resolved: Map<string, Module>): Module | null => {
    const module = new Module(name, stats);
    for (const [depName, count] of Object.entries(stats.num_cells_by_type)) {
        if (depName.startsWith('$')) {
            module.addPrimitive(depName.slice(1), count);
            continue;
        }

        const childDep = resolved.get(depName);
        if (!childDep) {
            // Cannot fully be resolved yet
            return null;
        }
        module.addChild(childDep, count);
    }

    return module;
};

const buildModuleTree = (modules: Record<string, YosysModuleStats>): Module[] => {
    const modEntries = Object.entries(modules);
    const modCount = modEntries.length;
    if (!modCount) {
        return [];
    }

    const resolved = new Map<string, Module>();
    while (resolved.size < modCount) {
        const oldSize = resolved.size;
        for (let i = modEntries.length - 1; i >= 0; i--) {
            const [modName, stats] = modEntries[i];
            const sanitizedName = modName.slice(1); // Strip leading "\"
            if (sanitizedName in resolved.keys()) {
                continue;
            }

            const module = resolveModuleDeps(sanitizedName, stats, resolved);
            if (!module) {
                continue;
            }
            resolved.set(sanitizedName, module);
            modEntries.splice(i, 1);
        }
        if (resolved.size <= oldSize) {
            throw new Error('Cyclic dependency loop detected; cannot resolve module dependency tree!');
        }
    }

    return Array.from(resolved.values()).reverse();
};

export class StatsViewer extends BaseViewer<YosysStats> {
    handleForeignViewMessage(message: ForeignViewMessage): void {
        console.log('Foreign message:');
        console.log(message);
    }

    private modules: Module[];

    private overviewGrid: DataGrid;

    private explorerHistory: Module[];
    private explorerBreadcrumbs: HTMLParagraphElement;
    private explorerGrid: DataGrid;

    constructor(mainView: View, initData: YosysStats) {
        super(mainView, initData);

        this.modules = buildModuleTree(this.data.modules);
        if (!this.modules) {
            throw new Error('No circuit modules found to display!');
        }

        this.overviewGrid = new DataGrid(['Module name', 'Memories / Bits', 'Processes', 'Cells']);

        this.explorerHistory = [this.modules[0]];
        this.explorerBreadcrumbs = document.createElement('p');
        this.explorerGrid = new DataGrid(['Module name', 'Count', 'Cells local / total']);
    }

    private renderExplorer() {
        // Breadcrumbs header
        this.explorerBreadcrumbs.replaceChildren();
        for (let i = 0; i < this.explorerHistory.length; i++) {
            const link = document.createElement('vscode-link');
            link.textContent = this.explorerHistory[i].name;
            link.addEventListener('click', (_ev) => {
                this.explorerHistory = this.explorerHistory.slice(0, i + 1);
                this.renderExplorer();
            });
            this.explorerBreadcrumbs.append(link);

            if (i != this.explorerHistory.length - 1) {
                this.explorerBreadcrumbs.append(' > ');
            }
        }

        // Explorer panel
        const target = this.explorerHistory[this.explorerHistory.length - 1];
        const fmtStat = (stat1: number, stat2: number) => `${stat1}/${stat2} (${(stat1 / stat2) * 100}%)`;

        this.explorerGrid.clearRows();
        this.explorerGrid.addRow([
            '<current circuit>',
            '-',
            fmtStat(target.localStats.cellCount, target.globalStats.cellCount)
        ]);
        for (const [prim, count] of target.primitives.entries()) {
            this.explorerGrid.addRow([`$${prim}`, count.toString(), '-']);
        }
        for (const [child, count] of target.children.entries()) {
            const link = document.createElement('vscode-link');
            link.textContent = child.name;
            link.addEventListener('click', (_ev) => {
                this.explorerHistory.push(child);
                this.renderExplorer();
            });

            this.explorerGrid.addRow([
                link,
                count.toString(),
                fmtStat(child.globalStats.cellCount * count, target.globalStats.cellCount)
            ]);
        }
    }

    async render(): Promise<void> {
        this.root.replaceChildren();

        // ** Overview Table **
        const overviewHeader = document.createElement('h2');
        overviewHeader.textContent = 'Circuit overview';
        this.root.appendChild(overviewHeader);

        this.overviewGrid.clearRows();
        this.overviewGrid.addRows(
            this.modules.map((module) => {
                const gloStat = module.globalStats;
                return [
                    module.name + (module.isTopLevel ? ' (top-level)' : ''),
                    `${gloStat.memoryCount} / ${gloStat.memoryBitCount}`,
                    gloStat.processCount.toString(),
                    gloStat.cellCount.toString()
                ];
            })
        );
        this.root.appendChild(this.overviewGrid.element);

        this.root.appendChild(document.createElement('br'));
        this.root.appendChild(document.createElement('vscode-divider'));

        // ** Circuit explorer **
        const explorerHeader = document.createElement('h2');
        explorerHeader.textContent = 'Circuit explorer';
        this.root.appendChild(explorerHeader);

        this.renderExplorer();
        this.root.appendChild(this.explorerBreadcrumbs);
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
