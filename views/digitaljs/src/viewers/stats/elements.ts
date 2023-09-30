import type {CustomEventListener, CustomEvents} from './events';
import {type Module, type ModuleStatId, getModuleStatIds, getModuleStatName} from './modules';

const fmtStat = (stat1: number, stat2: number): string => {
    let res = `${stat1}/${stat2}`;
    if (stat1 !== 0) {
        const perc = Math.floor((stat1 / stat2) * 10_000) / 100;
        res += ` (${perc}%)`;
    }

    return res;
};

export abstract class CustomElement {
    protected abstract rootElem: HTMLElement;

    private eventsElem: Element;

    constructor() {
        this.eventsElem = document.createElement('events');
    }

    addEventListener<K extends keyof CustomEvents>(type: K, listener: CustomEventListener<K>) {
        this.eventsElem.addEventListener(type, (ev: CustomEventInit) => listener(ev.detail));
    }

    protected dispatchEvent<K extends keyof CustomEvents>(type: K, data: CustomEvents[K]) {
        this.eventsElem.dispatchEvent(new CustomEvent(type, {detail: data}));
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

    delColumn(pos: number) {
        for (const row of this.cells) {
            row.splice(pos, 1);
        }

        if (pos >= 2) {
            this.dispatchEvent('overviewGridStatUpdate', {element: this, data: {index: pos - 2, statId: null}});
        }
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

abstract class InteractiveDataGrid<RowItem, ColumnOption> extends DataGrid {
    private rows: RowItem[];
    private cols: ColumnOption[];

    private actualRoot: HTMLElement;

    constructor() {
        super();

        this.rows = [];
        this.cols = [];

        // The object renders to this.rootElem, but we want buttons outside
        // the datagrid. This actualRoot is just a div containing those buttons
        // and the rendered rootElem so we can 'adopt' the buttons into this class.
        this.actualRoot = this.createRoot();

        this.reset(true, true);
    }

    override get element(): HTMLElement {
        return this.actualRoot;
    }

    protected abstract getDefaultOptions(): ColumnOption[];

    protected abstract getAvailableOptions(): ColumnOption[];

    protected abstract getNewOption(): ColumnOption;

    protected abstract getOptionName(option: ColumnOption): string;

    protected abstract getValue(item: RowItem, option: ColumnOption): DataGridCell;

    private createRoot() {
        const root = document.createElement('div');

        // Add column button
        const addColBtn = document.createElement('vscode-button');
        addColBtn.innerHTML = /* html */ `<span class="codicon codicon-add"></span>`;
        addColBtn.addEventListener('click', (_ev) => {
            this.addCol();
        });
        root.appendChild(addColBtn);

        // Reset button
        const resetBtn = document.createElement('vscode-button');
        resetBtn.innerHTML = /* html */ `<span class="codicon codicon-clear-all"></span>`;
        resetBtn.addEventListener('click', (_ev) => {
            this.reset(true, false);
        });
        root.appendChild(resetBtn);

        // The actual DataGrid
        root.appendChild(super.element);

        return root;
    }

    protected fillCell(x: number, y: number) {
        const defColsLen = this.getDefaultOptions().length;
        if (x < 0 || x >= defColsLen + this.cols.length || y < 1 || y - 1 >= this.rows.length) {
            throw new Error('Out of bounds!');
        }

        const option = this.getDefaultOptions().concat(this.cols)[x];
        const item = this.rows[y - 1];
        const value = this.getValue(item, option);

        return super.setCell(x, y, value);
    }

    addRowItem(item: RowItem): number {
        this.rows.push(item);
        const y = super.addRow([]);

        if (y !== 0) {
            for (let x = 0; x < this.width; x++) {
                this.fillCell(x, y);
            }
        }

        return y;
    }

    addCol(option?: ColumnOption): number {
        if (option === undefined) {
            option = this.getNewOption();
        }
        this.cols.push(option);

        const header = document.createElement('div');

        const delBtn = document.createElement('vscode-button');
        delBtn.innerHTML = /* html */ `<span class="codicon codicon-close"></span>`;
        delBtn.addEventListener('click', (_ev) => {
            const coli = this.cells[0].indexOf(header);
            const defColCount = this.getDefaultOptions().length;
            if (coli >= defColCount) {
                this.cols.splice(coli - defColCount, 1);
                this.delColumn(coli);
                this.render();
            }
        });
        header.appendChild(delBtn);

        const dropdown = document.createElement('vscode-dropdown') as HTMLSelectElement;
        for (const avOption of this.getAvailableOptions()) {
            const opt = document.createElement('vscode-option');
            opt.textContent = this.getOptionName(avOption);
            if (avOption === option) {
                opt.setAttribute('selected', '');
            }
            dropdown.appendChild(opt);
        }
        header.appendChild(dropdown);

        dropdown.addEventListener('change', (_ev) => {
            const headerIndex = this.cells[0].indexOf(header);
            if (headerIndex === -1) return;

            const newOption = this.getAvailableOptions()[dropdown.selectedIndex];

            // Actually update the column and re-render
            this.cols.splice(headerIndex - this.getDefaultOptions().length, 1, newOption);
            this.render();
        });

        const pos = super.addColumn([header]);

        this.render();

        for (let y = 1; y < this.height; y++) {
            this.fillCell(pos, y);
        }

        return pos;
    }

    reset(resetCols: boolean, resetRows: boolean) {
        if (resetCols) this.cols = [];
        if (resetRows) this.rows = [];

        this.clearRows();
        while (this.width > 0) {
            this.delColumn(0);
        }

        for (const option of this.getDefaultOptions()) {
            super.addColumn([this.getOptionName(option)]);
        }

        this.render();
    }

    render() {
        this.clearRows();

        this.rows.forEach(() => super.addRow([]));

        for (let y = 1; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.fillCell(x, y);
            }
        }

        super.render();
    }
}

type ModuleOverviewOptions = 'name' | 'count' | ModuleStatId;

export class ModuleOverviewGrid extends InteractiveDataGrid<Module, ModuleOverviewOptions> {
    private modules: Module[];

    constructor(modules: Module[]) {
        super();

        this.modules = modules;

        for (const module of modules) {
            this.addRowItem(module);
        }
    }

    protected getDefaultOptions(): ModuleOverviewOptions[] {
        return ['name'];
    }

    protected getAvailableOptions(): ModuleOverviewOptions[] {
        return getModuleStatIds();
    }

    protected getNewOption(): ModuleOverviewOptions {
        return this.getAvailableOptions()[0];
    }

    protected getOptionName(option: ModuleOverviewOptions): string {
        switch (option) {
            case 'name':
                return 'Module name';
            case 'count':
                return 'Count';
            default:
                return getModuleStatName(option);
        }
    }

    protected getValue(item: Module, option: ModuleOverviewOptions): DataGridCell {
        switch (option) {
            case 'name':
                return item.name;
            case 'count':
                return this.modules[0].globalChildren.get(item)?.toString() ?? '-';
            default:
                return fmtStat(item.globalStats[option], this.modules[0].globalStats[option]);
        }
    }
}

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
    private curModule: Module;

    constructor(initModule: Module) {
        super();

        this.curModule = initModule;

        this.setModule(this.curModule);
    }

    setModule(module: Module) {
        this.curModule = module;

        this.reset(false, true);

        this.addRowItem({type: 'current'});
        for (const prim of this.curModule.primitives.keys()) {
            this.addRowItem({type: 'primitive', primitive: prim});
        }
        for (const subCircuit of this.curModule.children.keys()) {
            this.addRowItem({type: 'child', module: subCircuit});
        }
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

    protected getOptionName(option: ModuleOverviewOptions): string {
        switch (option) {
            case 'name':
                return 'Module name';
            case 'count':
                return 'Count';
            default:
                return getModuleStatName(option);
        }
    }

    protected getValue(item: ModuleExplorerRowItems, option: ModuleOverviewOptions): DataGridCell {
        switch (item.type) {
            case 'current':
                return this.getValueCurrent(item, option);
            case 'primitive':
                return this.getValuePrimitive(item, option);
            case 'child':
                return this.getValueChild(item, option);
        }
    }

    private getValueCurrent(_item: ModuleExplorerRowCurrent, option: ModuleOverviewOptions): DataGridCell {
        switch (option) {
            case 'name':
                return '< Current Module >';
            case 'count':
                return '-';
            default:
                return '[TODO]'; // TODO
        }
    }

    private getValuePrimitive(item: ModuleExplorerRowPrimitive, option: ModuleOverviewOptions): DataGridCell {
        switch (option) {
            case 'name':
                return item.primitive;
            case 'count':
                return this.curModule.primitives.get(item.primitive)?.toString() ?? '-';
            default:
                return '[TODO]'; // TODO
        }
    }

    private getValueChild(item: ModuleExplorerRowChild, option: ModuleOverviewOptions): DataGridCell {
        switch (option) {
            case 'name': {
                const link = document.createElement('vscode-link');
                link.textContent = item.module.name;
                link.addEventListener('click', (_ev) => {
                    this.dispatchEvent('explorerModuleClicked', {element: this, data: {module: item.module}});
                });
                return link;
            }
            case 'count':
                return this.curModule.children.get(item.module)?.toString() ?? '-';
            default:
                return '[TODO]'; // TODO
        }
    }

    // render() {
    //     this.clearRows();

    //     // Current module stats
    //     this.addRow(
    //         ['<current circuit>', ''].concat(
    //             this.moduleStats.map((statId) => fmtStat(this.curModule.stats[statId], this.curModule.stats[statId]))
    //         )
    //     );

    //     // Primitives
    //     const rowFiller: string[] = new Array(this.width - 2).map((_) => '');
    //     for (const [prim, count] of this.curModule.primitives.entries()) {
    //         this.addRow([`$${prim}`, count.toString()].concat(rowFiller));
    //     }

    //     // Child modules
    //     for (const [child, count] of this.curModule.children.entries()) {
    //         const link = document.createElement('vscode-link');
    //         link.textContent = child.name;
    //         link.addEventListener('click', (_ev) => {
    //             this.dispatchEvent('explorerModuleClicked', {element: this, data: {module: child}});
    //         });

    //         this.addRow(
    //             [link, count.toString()].concat(
    //                 this.moduleStats.map((statId) =>
    //                     fmtStat(child.globalStats[statId] * count, this.curModule.globalStats[statId])
    //                 )
    //             )
    //         );
    //     }

    //     super.render();
    // }
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

    navigateSplice(i: number) {
        this.moduleBreadcrumbs.splice(i + 1);
        this.dispatchEvent('explorerFocusUpdate', {element: this, data: {module: this.moduleBreadcrumbs[i]}});
    }

    render(): void {
        this.rootElem.replaceChildren();

        for (let i = 0; i < this.moduleBreadcrumbs.length; i++) {
            const link = document.createElement('vscode-link');
            link.textContent = this.moduleBreadcrumbs[i].name;
            link.addEventListener('click', (_ev) => this.navigateSplice(i));
            this.rootElem.append(link);

            if (i != this.moduleBreadcrumbs.length - 1) {
                this.rootElem.append(' > ');
            }
        }
    }
}
