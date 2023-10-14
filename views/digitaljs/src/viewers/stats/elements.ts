import {type Module, type ModuleStatId, getModuleStatIds, getModuleStatName} from './modules';

const getPercentage = (val1: number, val2: number): number => {
    if (val1 === 0 || val2 === 0) {
        return 0;
    }

    return Math.floor((val1 / val2) * 10_000) / 100;
};

export abstract class CustomElement<EventsDirectory> {
    protected abstract rootElem: HTMLElement;

    private eventsElem: Element;

    constructor() {
        this.eventsElem = document.createElement('events');
    }

    addEventListener<K extends keyof EventsDirectory & string>(type: K, listener: (ev: EventsDirectory[K]) => void) {
        this.eventsElem.addEventListener(type, (ev: CustomEventInit) => listener(ev.detail));
    }

    protected dispatchEvent<K extends keyof EventsDirectory & string>(type: K, data: EventsDirectory[K]) {
        this.eventsElem.dispatchEvent(new CustomEvent(type, {detail: data}));
    }

    get element() {
        return this.rootElem;
    }

    abstract render(): void;
}

type DataGridCell = Node | string;

export class DataGrid<EventsDirectory> extends CustomElement<EventsDirectory> {
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

interface GridHeadersUpdateEvent<ColumnOption> {
    newHeaders: ColumnOption[];
}
interface InteractiveDataGridEvents<ColumnOption> {
    gridHeadersUpdate: GridHeadersUpdateEvent<ColumnOption>;
}

abstract class InteractiveDataGrid<RowItem, ColumnOption> extends DataGrid<InteractiveDataGridEvents<ColumnOption>> {
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

            this.dispatchEvent('gridHeadersUpdate', {newHeaders: this.cols});
        });
        root.appendChild(addColBtn);

        // Reset button
        const resetBtn = document.createElement('vscode-button');
        resetBtn.innerHTML = /* html */ `<span class="codicon codicon-clear-all"></span>`;
        resetBtn.addEventListener('click', (_ev) => {
            this.reset(true, false);

            this.dispatchEvent('gridHeadersUpdate', {newHeaders: this.cols});
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

    addCol(option?: ColumnOption, onlyDraw = false): number {
        if (option === undefined) {
            option = this.getNewOption();
        }
        if (!onlyDraw) {
            this.cols.push(option);
        }

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

                this.dispatchEvent('gridHeadersUpdate', {newHeaders: this.cols});
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

            this.dispatchEvent('gridHeadersUpdate', {newHeaders: this.cols});
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

        // Clear all row/cols
        this.clearRows();
        while (this.width > 0) {
            this.delColumn(0);
        }

        // Restore them again
        for (const option of this.getDefaultOptions()) {
            super.addColumn([this.getOptionName(option)]);
        }
        for (const col of this.cols) {
            this.addCol(col, true);
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
        return ['name', 'count'];
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
            default: {
                const stat1 = item.globalStats[option];
                const stat2 = this.modules[0].globalStats[option];

                return `${stat1}/${stat2} (${getPercentage(stat1, stat2)}%)`;
            }
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
                return this.curModule.globalStats[option].toString();
        }
    }

    private getValuePrimitive(item: ModuleExplorerRowPrimitive, option: ModuleOverviewOptions): DataGridCell {
        switch (option) {
            case 'name':
                return item.primitive;
            case 'count':
                return this.curModule.primitives.get(item.primitive)?.toString() ?? '-';
            default:
                return '';
        }
    }

    private getValueChild(item: ModuleExplorerRowChild, option: ModuleOverviewOptions): DataGridCell {
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

interface Tab<EventsDictionary> {
    title: string;
    element: CustomElement<EventsDictionary>;
}

export class TabsContainer extends CustomElement<Record<string, never>> {
    protected rootElem: HTMLElement;

    private tabs: Tab<unknown>[];

    constructor(tabs: Tab<unknown>[]) {
        super();

        this.tabs = tabs;

        this.rootElem = this.createRoot();
    }

    private createRoot(): HTMLElement {
        const root = document.createElement('vscode-panels');

        for (let i = 0; i < this.tabs.length; i++) {
            const tab = document.createElement('vscode-panel-tab');
            tab.id = `tab-${i}`;
            tab.textContent = this.tabs[i].title;
            root.appendChild(tab);
        }
        for (let i = 0; i < this.tabs.length; i++) {
            const view = document.createElement('vscode-panel-view');
            view.id = `view-${i}`;
            view.appendChild(this.tabs[i].element.element);
            root.appendChild(view);
        }

        return root;
    }

    render(): void {
        for (const tab of this.tabs) {
            tab.element.render();
        }
    }
}
