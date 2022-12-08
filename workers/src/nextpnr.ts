import {Nextpnr} from 'nextpnr';
import wasmBinaryUrl from 'nextpnr/dist/nextpnr-ecp5.wasm';

import {WorkerTool} from './worker';

export class WorkerNextpnr extends WorkerTool<Nextpnr> {

    async initialize(): Promise<Nextpnr> {
        // Fetch WebAssembly binary from data URL
        const wasmBinary = await this.fetchBinary(wasmBinaryUrl);

        // Initialize nextpnr
        const nextpnr = await Nextpnr.initialize({
            wasmBinary,
            print: this.print.bind(this, 'stdout'),
            printErr: this.print.bind(this, 'stderr')
        });

        return nextpnr;
    }
}

export const worker = new WorkerNextpnr();
