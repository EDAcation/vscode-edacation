import {type RunOptions, type Tree, WorkerTool} from './worker.js';

// ESM imports are not possible in CJS modules
const importPromise = import(
    /* webpackMode: "eager" */
    '@yowasp/nextpnr-ecp5'
);

export class WorkerNextpnrEcp5 extends WorkerTool {
    async run(args: string[], inputFileTree: Tree, options: RunOptions): Promise<Tree> {
        const {runNextpnrEcp5} = await importPromise;
        return await runNextpnrEcp5(args, inputFileTree, options);
    }
}

export const worker = new WorkerNextpnrEcp5();
