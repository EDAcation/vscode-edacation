import {Nextpnr} from 'nextpnr';
import wasmBinaryUrl from 'nextpnr/dist/nextpnr-ice40.wasm';

import {WorkerTool} from './worker';

export class WorkerNextpnr extends WorkerTool<Nextpnr> {

    async initialize(): Promise<Nextpnr> {
        // Fetch WebAssembly binary from data URL
        const wasmBinary = await this.fetchBinary(wasmBinaryUrl);

        // Initialize Yosys
        const yosys = await Nextpnr.initialize({
            wasmBinary
        });

        return yosys;
    }

    async execute(): Promise<void> {
        console.log('execute');

        const tool = await this.getTool();
        console.log(tool);
    }
}

export const worker = new WorkerNextpnr();
