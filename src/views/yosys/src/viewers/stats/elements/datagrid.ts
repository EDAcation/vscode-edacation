import {CustomElement} from './base';

export type DataGridCellElem = Node | string;

type CellBorder = 'top' | 'left' | 'right' | 'bottom';
type BorderWidth = 'thin' | 'medium' | 'thick';

export interface DataGridCell {
    elem: DataGridCellElem;
    borderColor?: string; // Default: no color (= disable)
    borderWidth?: BorderWidth; // Default: medium
    borders?: CellBorder[]; // Default: no borders
}

export class DataGrid<EventsDirectory> extends CustomElement<EventsDirectory> {
    protected rootElem: HTMLElement;

    protected cells: DataGridCell[][];

    constructor(headers: string[] = []) {
        super();

        this.cells = [headers.map((h) => ({elem: h}))];
        this.rootElem = document.createElement('vscode-data-grid');
    }

    get width() {
        return this.cells[0].length;
    }

    get height() {
        return this.cells.length;
    }

    private setCellColor(x: number, y: number, gridCell: HTMLElement) {
        const cell = this.cells[y][x];
        const cellColor = cell?.borderColor;
        const cellBorders = cell?.borders ?? [];

        gridCell.style.borderWidth = cell?.borderWidth ?? 'medium';
        gridCell.style.borderColor = cellColor ?? 'none';

        // Color a certain border only if it is specified and there is a color
        const doTop = cellBorders.indexOf('top') !== -1 && cellColor;
        const doLeft = cellBorders.indexOf('left') !== -1 && cellColor;
        const doRight = cellBorders.indexOf('right') !== -1 && cellColor;
        const doBottom = cellBorders.indexOf('bottom') !== -1 && cellColor;

        // Set border styles, hide border if cell color is undefined
        gridCell.style.borderTopStyle = doTop ? 'solid' : 'none';
        gridCell.style.borderLeftStyle = doLeft ? 'solid' : 'none';
        gridCell.style.borderRightStyle = doRight ? 'solid' : 'none';
        gridCell.style.borderBottomStyle = doBottom ? 'solid' : 'none';
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
        const cell = row.querySelectorAll('vscode-data-grid-cell')[x] as HTMLElement;
        if (!cell) {
            return;
        }
        cell.replaceChildren();
        cell.append(value.elem);

        this.setCellColor(x, y, cell);
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
            cell.append(this.cells[0][i].elem);
            headerElem.appendChild(cell);
            this.setCellColor(i, 0, cell);
        }
        this.rootElem.appendChild(headerElem);

        // Rows
        for (let rowi = 1; rowi < this.height; rowi++) {
            const row = document.createElement('vscode-data-grid-row');

            for (let coli = 0; coli < this.width; coli++) {
                const cell = document.createElement('vscode-data-grid-cell');
                cell.setAttribute('grid-column', (coli + 1).toString());
                cell.append(this.cells[rowi][coli].elem);
                row.appendChild(cell);
                this.setCellColor(coli, rowi, cell);
            }
            this.rootElem.appendChild(row);
        }
    }
}

export interface DatagridSetting {
    id: string;
    text: string;
    default: boolean;
}

export interface InteractiveDatagridConfig<ColumnOption> {
    columns: ColumnOption[] | null;
    settingValues: Record<string, boolean> | null;
}

interface GridConfigUpdateEvent<ColumnOption> {
    config: InteractiveDatagridConfig<ColumnOption>;
}
interface InteractiveDataGridEvents<ColumnOption> {
    gridConfigUpdate: GridConfigUpdateEvent<ColumnOption>;
}

export abstract class InteractiveDataGrid<RowItem, ColumnOption> extends DataGrid<
    InteractiveDataGridEvents<ColumnOption>
> {
    private rows: RowItem[];
    private cols: ColumnOption[];

    private actualRoot: HTMLElement | null;

    private settingElems: Map<string, HTMLInputElement>;

    constructor() {
        super();

        this.rows = [];
        this.cols = [];
        this.actualRoot = null;

        // Create setting checkboxes (store references)
        this.settingElems = new Map();
        for (const setting of this.getSettings()) {
            const checkbox = document.createElement('vscode-checkbox') as HTMLInputElement;
            checkbox.addEventListener('change', (_) => {
                this.dispatchEvent('gridConfigUpdate', {config: this.getConfig()});

                this.update();
            });
            if (setting.default) {
                checkbox.setAttribute('checked', 'true');
            }
            checkbox.textContent = setting.text;
            this.settingElems.set(setting.id, checkbox);
        }

        // The object renders to this.rootElem, but we want elements outside
        // the datagrid. This actualRoot is just a div containing those elements
        // and the rendered rootElem so we can 'adopt' them into this class.
        this.actualRoot = null;

        this.reset(true, true);
    }

    override get element(): HTMLElement {
        if (this.actualRoot === null) {
            this.actualRoot = this.createRoot();
        }
        return this.actualRoot;
    }

    getConfig(): InteractiveDatagridConfig<ColumnOption> {
        return {
            columns: this.cols,
            settingValues: Object.fromEntries(
                Array.from(this.settingElems.entries()).map(([id, elem]) => [id, elem.checked])
            )
        };
    }

    setConfig(config?: InteractiveDatagridConfig<ColumnOption>) {
        if (!config) {
            return;
        }

        if (config.columns) {
            this.reset(true, false);

            for (const col of config.columns) {
                this.addCol(col);
            }
        }

        for (const [key, value] of Object.entries(config.settingValues ?? {})) {
            this.setSetting(key, value);
        }

        this.update();
    }

    protected getSetting(settingId: string): boolean {
        return this.settingElems.get(settingId)?.checked || false;
    }

    protected setSetting(settingId: string, value: boolean) {
        const settingElem = this.settingElems.get(settingId);
        if (!settingElem) {
            return;
        }

        if (value) {
            settingElem.setAttribute('checked', 'true');
        } else {
            settingElem.removeAttribute('checked');
        }
    }

    // *** Start overrideable methods ***

    update() {
        this.render();
    }

    abstract getIdentifier(): string;

    protected abstract getSettings(): DatagridSetting[];

    protected abstract getDefaultOptions(): ColumnOption[];

    protected abstract getAvailableOptions(): ColumnOption[];

    protected abstract getNewOption(): ColumnOption;

    protected abstract getOptionName(option: ColumnOption): string;

    protected abstract getValue(item: RowItem, option: ColumnOption): DataGridCell;

    protected getGridHeaderElement(): HTMLElement {
        const root = document.createElement('div');

        // Add settings
        for (const checkbox of this.settingElems.values()) {
            root.appendChild(checkbox);
            root.appendChild(document.createElement('br'));
        }

        if (this.getSettings().length !== 0) {
            root.appendChild(document.createElement('vscode-divider'));
            root.appendChild(document.createElement('br'));
        }

        // Add column button
        const addColBtn = document.createElement('vscode-button');
        addColBtn.innerHTML = /* html */ `<span class="codicon codicon-add"></span>`;
        addColBtn.addEventListener('click', (_ev) => {
            this.addCol();

            this.dispatchEvent('gridConfigUpdate', {config: this.getConfig()});
        });
        root.appendChild(addColBtn);

        // Reset button
        const resetBtn = document.createElement('vscode-button');
        resetBtn.innerHTML = /* html */ `<span class="codicon codicon-clear-all"></span>`;
        resetBtn.addEventListener('click', (_ev) => {
            this.reset(true, false);

            this.dispatchEvent('gridConfigUpdate', {config: this.getConfig()});
        });
        root.appendChild(resetBtn);

        return root;
    }

    // *** End overrideable methods ***

    private createRoot() {
        const root = document.createElement('div');
        root.style.width = '100%';

        // Custom content
        root.appendChild(this.getGridHeaderElement());

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
            const coli = this.cells[0].map((cell) => cell.elem).indexOf(header);
            const defColCount = this.getDefaultOptions().length;
            if (coli >= defColCount) {
                this.cols.splice(coli - defColCount, 1);
                this.delColumn(coli);
                this.render();

                this.dispatchEvent('gridConfigUpdate', {config: this.getConfig()});
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
            const headerIndex = this.cells[0].map((cell) => cell.elem).indexOf(header);
            if (headerIndex === -1) return;

            const newOption = this.getAvailableOptions()[dropdown.selectedIndex];

            // Actually update the column and re-render
            this.cols.splice(headerIndex - this.getDefaultOptions().length, 1, newOption);
            this.render();

            this.dispatchEvent('gridConfigUpdate', {config: this.getConfig()});
        });

        const pos = super.addColumn([{elem: header}]);

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
            super.addColumn([{elem: this.getOptionName(option)}]);
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
