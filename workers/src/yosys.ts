import {Yosys} from 'yosys';
import wasmBinaryUrl from 'yosys/dist/yosys.wasm';

import {WorkerTool} from './worker';

export class WorkerYosys extends WorkerTool<Yosys> {

    async initialize(): Promise<Yosys> {
        // Fetch WebAssembly binary from data URL
        const wasmBinary = await this.fetchBinary(wasmBinaryUrl);

        // Initialize Yosys
        const yosys = await Yosys.initialize({
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

export const worker = new WorkerYosys();
