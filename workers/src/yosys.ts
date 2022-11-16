import {Yosys} from 'yosys';
import wasmBinary from 'yosys/dist/yosys.wasm';

import {WorkerTool} from './worker';

export class WorkerYosys extends WorkerTool<Yosys> {

    async initialize(): Promise<Yosys> {
        const yosys = await Yosys.initialize({
            wasmBinary
        });
        return yosys;
    }

    async execute(): Promise<void> {
        console.log('execute');
    }
}

export const worker = new WorkerYosys();
