import {Yosys} from 'yosys';
import wasmBinaryUrl from 'yosys/dist/yosys.wasm';

import {WorkerTool} from './worker.js';

export class WorkerYosys extends WorkerTool<Yosys> {
    async getFS(): Promise<typeof FS> {
        const fs = await super.getFS();

        // Yosys sets up this dir by itself, removing it prevents that process from crashing
        fs.rmdir('/hostcwd');

        return fs;
    }

    async initialize(): Promise<Yosys> {
        // Fetch WebAssembly binary from data URL
        const wasmBinary = await this.fetchBinary(wasmBinaryUrl);

        // Initialize Yosys
        const yosys = await Yosys.initialize({
            wasmBinary,
            print: this.print.bind(this, 'stdout'),
            printErr: this.print.bind(this, 'stderr')
        });

        return yosys;
    }
}

export const worker = new WorkerYosys();
