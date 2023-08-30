import type {CustomEventListener, CustomEvents} from './events';
import {type Module, ModuleStatId, getModuleStatIds, getModuleStatName} from './modules';

const fmtStat = (stat1: number, stat2: number): string => {
    let res = `${stat1}/${stat2}`;
    if (stat1 !== 0) {
        res += ` (${(stat1 / stat2) * 100}%)`;
    }

    return res;
};

export abstract class CustomElement {
    protected abstract rootElem: HTMLElement;

    addEventListener<K extends keyof CustomEvents>(type: K, listener: CustomEventListener<K>) {
        this.element.addEventListener(type, (ev: CustomEventInit) => listener(ev.detail));
    }

    protected dispatchEvent<K extends keyof CustomEvents>(type: K, data: CustomEvents[K]) {
        this.element.dispatchEvent(new CustomEvent(type, {detail: data}));
    }

    get element() {
        return this.rootElem;
    }

    abstract render(): void;
}

type DataGridCell = Node | string;

export class DataGrid extends CustomElement {
    protected rootElem: HTMLElement;

    protected cells: DataGridCell[][];

    constructor(headers: string[] = []) {
        super();

        this.cells = [headers];
        this.rootElem = document.createElement('vscode-data-grid');
    }

    get width() {
        return this.cells[0].length;
    }

    get height() {
        return this.cells.length;
    }

    addColumn(contents: DataGridCell[], pos?: number): number {
        contents = contents.slice(0, this.height);
        if (contents.length < this.height) {
            contents = contents.concat(new Array(this.height - contents.length));
        }

        if (pos === undefined) {
            pos = this.width;
        }

        for (let i = 0; i < this.height; i++) {
            this.cells[i].splice(pos, 0, contents[i]);
        }

        return pos;
    }

    addRow(contents: DataGridCell[], pos?: number): number {
        contents = contents.slice(0, this.width);
        if (contents.length < this.width) {
            contents = contents.concat(new Array(this.height - contents.length));
        }

        if (pos === undefined) {
            pos = this.height - 1;
        }

        this.cells.splice(pos + 1, 0, contents);

        return pos;
    }

    setCell(x: number, y: number, value: DataGridCell) {
        this.cells[y][x] = value;

        const row = this.rootElem.querySelectorAll('vscode-data-grid-row')[y];
        if (!row) {
            return;
        }
        const cell = row.querySelectorAll('vscode-data-grid-cell')[x];
        if (!cell) {
            return;
        }
        cell.replaceChildren();
        cell.append(value);
    }

    clearRows() {
        this.cells.splice(1);
    }

    render() {
        const newRoot = document.createElement('vscode-data-grid');
        this.rootElem.replaceWith(newRoot);
        this.rootElem = newRoot;

        // Headers
        const headerElem = document.createElement('vscode-data-grid-row');
        headerElem.setAttribute('row-type', 'header');

        for (let i = 0; i < this.width; i++) {
            const cell = document.createElement('vscode-data-grid-cell');
            cell.setAttribute('cell-type', 'columnheader');
            cell.setAttribute('grid-column', (i + 1).toString());
            cell.append(this.cells[0][i]);
            headerElem.appendChild(cell);
        }
        this.rootElem.appendChild(headerElem);

        // Rows
        for (let rowi = 1; rowi < this.height; rowi++) {
            const row = document.createElement('vscode-data-grid-row');

            for (let coli = 0; coli < this.width; coli++) {
                const cell = document.createElement('vscode-data-grid-cell');
                cell.setAttribute('grid-column', (coli + 1).toString());
                cell.append(this.cells[rowi][coli]);
                row.appendChild(cell);
            }
            this.rootElem.appendChild(row);
        }
    }
}

export class ModuleOverviewGrid extends DataGrid {
    private moduleStats: ModuleStatId[];

    private readonly modules: Module[];

    constructor(modules: Module[]) {
        super();

        this.modules = modules;
        this.moduleStats = [];

        super.addColumn(['Module Name']);
        super.addColumn(['Count']);
    }

    private fillCell(x: number, y: number, statId?: ModuleStatId) {
        if (x === 0 || y === 0) {
            throw new Error('Cannot fill header cells!');
        }

        if (x === 1) {
            // TODO: add module count
            return super.setCell(x, y, '-');
        }

        if (!statId) {
            // Find active column stat id
            const dropdown = this.cells[0][x];
            if (!(dropdown instanceof Element)) {
                return super.setCell(x, y, '-');
            }
            const activeId = dropdown.getAttribute('aria-activedescendant');
            const activeElem = dropdown.querySelector(`#${activeId}`);
            statId = activeElem?.getAttribute('stat-id') as ModuleStatId;
            if (!statId) {
                return;
            }
        }

        return super.setCell(
            x,
            y,
            fmtStat(this.modules[y - 1].globalStats[statId], this.modules[0].globalStats[statId])
        );
    }

    addRow(contents: DataGridCell[], pos?: number): number {
        const y = super.addRow(contents, pos);

        if (y !== 0) {
            for (let x = 1; x < this.width; x++) {
                this.fillCell(x, y);
            }
        }

        return y;
    }

    addColumn(): number {
        const header = document.createElement('vscode-dropdown');
        for (const id of getModuleStatIds()) {
            const opt = document.createElement('vscode-option');
            opt.textContent = getModuleStatName(id);
            opt.setAttribute('stat-id', id);
            header.appendChild(opt);
        }
        const pos = super.addColumn([header]);

        // Render after 100ms, the dropdown isn't updated immediately
        header.addEventListener('change', (_ev) => setTimeout(this.render.bind(this), 100));

        // Adds the new column into the table
        this.render();

        // Fill column cells with default values
        for (let y = 1; y < this.height; y++) {
            this.fillCell(pos, y, Object.values(ModuleStatId)[0]);
        }

        return pos;
    }

    render() {
        this.clearRows();

        for (const module of this.modules) {
            const row = [module.name + (module.isTopLevel ? ' (top-level)' : '')];
            for (const statId of this.moduleStats) {
                row.push(module.globalStats[statId].toString());
            }
            this.addRow(row);
        }

        for (let y = 1; y < this.height; y++) {
            for (let x = 1; x < this.width; x++) {
                this.fillCell(x, y);
            }
        }

        super.render();
    }
}

export class ModuleExplorerGrid extends DataGrid {
    private curModule: Module;

    private moduleStats: ModuleStatId[];

    constructor(initModule: Module) {
        super();

        this.curModule = initModule;
        this.moduleStats = [];

        this.addColumn(['Module Name']);
        this.addColumn(['Count']);
    }

    setModule(module: Module) {
        this.curModule = module;
    }

    addStat(stat: ModuleStatId) {
        if (this.moduleStats.indexOf(stat) !== -1) {
            return;
        }
        this.moduleStats.push(stat);
        this.addColumn([getModuleStatName(stat)]);
    }

    render() {
        this.clearRows();

        // Current module stats
        this.addRow(
            ['<current circuit>', ''].concat(
                this.moduleStats.map((statId) =>
                    fmtStat(this.curModule.localStats[statId], this.curModule.localStats[statId])
                )
            )
        );

        // Primitives
        const rowFiller: string[] = new Array(this.width - 2).map((_) => '');
        for (const [prim, count] of this.curModule.primitives.entries()) {
            this.addRow([`$${prim}`, count.toString()].concat(rowFiller));
        }

        // Child modules
        for (const [child, count] of this.curModule.children.entries()) {
            const link = document.createElement('vscode-link');
            link.textContent = child.name;
            link.addEventListener('click', (_ev) => {
                this.dispatchEvent('explorerModuleClicked', {element: this, data: {module: child}});
            });

            this.addRow(
                [link, count.toString()].concat(
                    this.moduleStats.map((statId) =>
                        fmtStat(child.globalStats[statId] * count, this.curModule.globalStats[statId])
                    )
                )
            );
        }

        super.render();
    }
}

export class ModuleNavigator extends CustomElement {
    protected rootElem: HTMLElement;

    private moduleBreadcrumbs: Module[];

    constructor(initModule: Module) {
        super();

        this.rootElem = document.createElement('p');
        this.moduleBreadcrumbs = [initModule];
    }

    navigateModule(module: Module) {
        this.moduleBreadcrumbs.push(module);
    }

    render(): void {
        this.rootElem.replaceChildren();

        for (let i = 0; i < this.moduleBreadcrumbs.length; i++) {
            const link = document.createElement('vscode-link');
            link.textContent = this.moduleBreadcrumbs[i].name;
            link.addEventListener('click', (_ev) => {
                this.moduleBreadcrumbs.splice(i + 1);
                this.dispatchEvent('explorerFocusUpdate', {element: this, data: {module: this.moduleBreadcrumbs[i]}});
            });
            this.rootElem.append(link);

            if (i != this.moduleBreadcrumbs.length - 1) {
                this.rootElem.append(' > ');
            }
        }
    }
}
