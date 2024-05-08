import {type RunOptions, type Tree, WorkerTool} from './worker.js';

// ESM imports are not possible in CJS modules
const importPromise = import(
    /* webpackMode: "eager" */
    '@yowasp/yosys'
);

export class WorkerYosys extends WorkerTool {
    async run(args: string[], inputFileTree: Tree, options: RunOptions): Promise<Tree> {
        const {runYosys} = await importPromise;
        return (await runYosys(args, inputFileTree, options)) || {};
    }
}

export const worker = new WorkerYosys();
