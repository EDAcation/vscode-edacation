// @ts-expect-error: TODO: add module declaration (digitaljs.d.ts)
import {Circuit} from 'digitaljs';
import {yosys2digitaljs} from 'yosys2digitaljs';

import type {ForeignViewMessage} from '../messages';
import type {YosysRTL} from '../types';

import {BaseViewer} from './base';

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
    handleForeignViewMessage(message: ForeignViewMessage): void {
        console.log('Foreign message:');
        console.log(message);
    }

    async render() {
        // Convert from Yosys netlist to DigitalJS format
        const digitalJs = yosys2digitaljs(this.data);

        // Initialize circuit
        const circuit = new Circuit(digitalJs);

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
        `;
        this.root.appendChild(elementActions);

        const buttonStart = document.getElementById('digitaljs-start');
        const buttonStop = document.getElementById('digitaljs-stop');
        const buttonExport = document.getElementById('digitaljs-export');

        buttonStart?.addEventListener('click', () => circuit.start());
        buttonStop?.addEventListener('click', () => circuit.stop());
        buttonExport?.addEventListener('click', this.requestExport.bind(this));

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
        circuit.displayOn(elementCircuit);
        this.root.appendChild(elementCircuit);
    }

    private requestExport() {
        // Find our SVG root element
        const svgElems = document.getElementsByTagName('svg');
        if (!svgElems) {
            throw new Error('Could not find SVG element to export');
        }
        const svgElem = svgElems[0];

        // Extract viewable SVG data from elem
        const svgData = getSvg(
            // Deep clone so we don't affect the SVG in the DOM
            svgElem.cloneNode(true) as Element,
            svgElem.clientWidth,
            svgElem.clientHeight
        );

        // Send save request to main worker
        this.sendMessage({
            type: 'requestSave',
            data: {
                fileContents: svgData,
                defaultPath: 'export.svg',
                filters: {svg: ['.svg']}
            }
        });
    }
}
