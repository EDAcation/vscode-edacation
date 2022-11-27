import {yosys2digitaljs} from 'yosys2digitaljs';
// @ts-ignore: TODO: add module declaration (digitaljs.d.ts)
import {Circuit} from 'digitaljs';

const root = document.querySelector<HTMLDivElement>('#app');

// TODO: obtain from VS Code
const content = '';

// Parse JSON netlist
const json = JSON.parse(content);

// Convert it to DigitalJS format
const digitalJs = yosys2digitaljs(json);

// Initialize and display DigitalJS circuit
const circuit = new Circuit(digitalJs);
circuit.displayOn(root);
