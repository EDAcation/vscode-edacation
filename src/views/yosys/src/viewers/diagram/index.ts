import {Circuit, getCellTypeStr} from 'digitaljs';
import {getElementGroups} from 'edacation';
import {yosys2digitaljs} from 'yosys2digitaljs';

import type {ForeignViewMessage} from '../../messages';
import type {YosysRTL} from '../../types';
import {BaseViewer} from '../base';

// TODO: better typing - should be fixed from our digitaljs fork
type Model = any; // eslint-disable-line @typescript-eslint/no-explicit-any

interface ButtonCallback {
    circuit: typeof Circuit;
    model: Model;
    paper: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    navHistory: Model[];
}

// type CellAttrDef = Record<string, CellAttrDef>;
interface CellAttrDef {
    [key: string]: CellAttrDef | string;
}

const getSvg = (svgElem: Element, width: number, height: number): string => {
    // Filter conveniently labeled foreign objects from element
    const foreignElems = svgElem.getElementsByTagName('foreignObject');
    for (const elem of Array.from(foreignElems)) {
        elem.remove();
    }

    // Set correct XML namespace
    svgElem.removeAttribute('xmlns:xlink');
    svgElem.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // Correctly specify width / height to prevent clipping
    svgElem.setAttribute('width', `${width}px`);
    svgElem.setAttribute('height', `${height}px`);

    // Add XML header
    return '<?xml version="1.0" encoding="utf-8"?>\n' + svgElem.outerHTML;
};

export class DiagramViewer extends BaseViewer<YosysRTL> {
    private subCircuitButtons = [
        {
            id: 'exportSvg',
            buttonText: 'SVG',
            callback: ({model, paper}: ButtonCallback) => {
                this.requestExport(paper.svg, `${model.get('label')}.svg`);
            }
        },
        {
            id: 'showStats',
            buttonText: '🔍',
            callback: ({navHistory}: ButtonCallback) => {
                const cellHistory = navHistory.map((model) => model.get('celltype') as string);
                this.broadcastMessage({type: 'moduleFocus', breadcrumbs: cellHistory});
            }
        }
    ];

    handleForeignViewMessage(message: ForeignViewMessage): void {
        console.log('Foreign message:');
        console.log(message);
    }

    async render(_isUpdate: boolean) {
        // Convert from Yosys netlist to DigitalJS format
        const digitalJs = yosys2digitaljs(this.data);

        // Generate table for custom cell colors
        const cellAttrs: Record<string, CellAttrDef> = {};
        for (const [name, group] of getElementGroups().entries()) {
            const cellName = getCellTypeStr('$' + name);
            if (!cellName) {
                continue; // Not supported
            }
            cellAttrs[cellName] = {body: {fill: group.color}};
        }
        cellAttrs['Subcircuit'] = {body: {stroke: 'blue'}};

        // Initialize circuit
        const circuit = new Circuit(digitalJs, {subcircuitButtons: this.subCircuitButtons, cellAttributes: cellAttrs});

        // Clear
        this.root.replaceChildren();

        // Render actions
        const elementActions = document.createElement('div');
        elementActions.style.marginBottom = '1rem';
        elementActions.innerHTML = /*html*/ `
            <vscode-button id="digitaljs-start">
                Start
                <span slot="start" class="codicon codicon-debug-start" />
            </vscode-button>
            <vscode-button id="digitaljs-stop" disabled>
                Stop
                <span slot="start" class="codicon codicon-debug-stop" />
            </vscode-button>
            <vscode-button id="digitaljs-export">
                Export to SVG
                <span slot="start" class="codicon codicon-save" />
            </vscode-button>
            <vscode-button id="digitaljs-zoomout">
                Zoom out
                <span slot="start" class="codicon codicon-zoom-out" />
            </vscode-button>
            <vscode-button id="digitaljs-zoomin">
                Zoom in
                <span slot="start" class="codicon codicon-zoom-in" />
            </vscode-button>
        `;
        this.root.appendChild(elementActions);

        const buttonStart = document.getElementById('digitaljs-start');
        const buttonStop = document.getElementById('digitaljs-stop');
        const buttonExport = document.getElementById('digitaljs-export');
        const buttonZoomOut = document.getElementById('digitaljs-zoomout');
        const buttonZoomIn = document.getElementById('digitaljs-zoomin');

        buttonStart?.addEventListener('click', () => circuit.start());
        buttonStop?.addEventListener('click', () => circuit.stop());
        buttonExport?.addEventListener('click', () => {
            const svgElems = document.getElementsByTagName('svg');
            if (!svgElems) {
                throw new Error('Could not find SVG element to export');
            }
            const svgElem = svgElems[0];

            this.requestExport(svgElem, 'topLevel.svg');
        });

        circuit.on('changeRunning', () => {
            if (circuit.running) {
                buttonStart?.setAttribute('disabled', '');
                buttonStop?.removeAttribute('disabled');
            } else {
                buttonStart?.removeAttribute('disabled');
                buttonStop?.setAttribute('disabled', '');
            }
        });

        // Render circuit
        const elementCircuit = document.createElement('div');
        const mainPaper = circuit.displayOn(elementCircuit);

        // Zoom buttons
        let zoomLevel = 0;
        buttonZoomOut?.addEventListener('click', () => {
            zoomLevel -= 1;
            circuit.scaleAndRefreshPaper(mainPaper, zoomLevel);
        });
        buttonZoomIn?.addEventListener('click', () => {
            zoomLevel += 1;
            circuit.scaleAndRefreshPaper(mainPaper, zoomLevel);
        });

        this.root.appendChild(elementCircuit);
    }

    private requestExport(elem: Element, defaultPath: string) {
        const svgData = getSvg(elem.cloneNode(true) as Element, elem.clientWidth, elem.clientHeight);
        this.sendMessage({
            type: 'requestSave',
            data: {
                fileContents: svgData,
                defaultPath: defaultPath,
                filters: {svg: ['.svg']}
            }
        });
    }
}
