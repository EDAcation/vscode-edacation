import {type RunOptions, type Tree, WorkerTool} from './worker.js';

// ESM imports are not possible in CJS modules
const importPromise = import(
    /* webpackMode: "eager" */
    '@yowasp/nextpnr-ice40'
);

export class WorkerNextpnrIce40 extends WorkerTool {
    async run(args: string[], inputFileTree: Tree, options: RunOptions): Promise<Tree> {
        const {runNextpnrIce40} = await importPromise;
        return await runNextpnrIce40(args, inputFileTree, options);
    }
}

export const worker = new WorkerNextpnrIce40();
