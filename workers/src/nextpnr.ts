import {Nextpnr} from 'nextpnr';
import wasmBinary from 'nextpnr/dist/nextpnr-ice40.wasm';

import {WorkerTool} from './worker';

export class WorkerNextpnr extends WorkerTool<Nextpnr> {

    async initialize(): Promise<Nextpnr> {
        const nextpnr = await Nextpnr.initialize({
            wasmBinary
        });
        return nextpnr;
    }

    async execute(): Promise<void> {
        console.log('execute');
    }
}

export const worker = new WorkerNextpnr();
