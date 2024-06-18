type Module = any; // TODO: refine?

const moduleCache = new Map<string, Module>();

export const importSync = (module: string): Module => {
    const cached = moduleCache.get(module);
    if (cached) return cached;

    console.log(`Importing node module (!sync!): ${module}`);

    const mod = __non_webpack_require__(module);
    moduleCache.set(module, mod);
    return mod;
};

export const importAsync = async (module: string): Promise<Module> => {
    const cached = moduleCache.get(module);
    if (cached) return cached;

    console.log(`Importing node module (async): ${module}`);

    let mod;
    try {
        mod = await import(/* webpackIgnore: true */ module);
    } catch {
        throw new Error(`Could not import module: ${module}`);
    }
    moduleCache.set(module, mod);
    return mod;
};

export const isAvailable = (): boolean => typeof Worker === 'undefined';

export type ModuleChildProcess = typeof import('child_process');
export type ModuleFS = typeof import('fs');
export type ModuleOS = typeof import('os');
export type ModuleStream = typeof import('stream');
export type ModuleTarFS = typeof import('tar-fs');
export type ModuleWorkerThreads = typeof import('worker_threads');
export type ModuleZLib = typeof import('zlib');

export const childProcess = async () => importAsync('child_process') as Promise<ModuleChildProcess>;
export const fs = async () => importAsync('fs') as Promise<ModuleFS>;
export const os = async () => importAsync('os') as Promise<ModuleOS>;
export const stream = async () => importAsync('stream') as Promise<ModuleStream>;
export const tar = async () => importAsync('tar-fs') as Promise<ModuleTarFS>;
export const workerThreads = async () => importAsync('worker_threads') as Promise<ModuleWorkerThreads>;
export const zlib = async () => importAsync('zlib') as Promise<ModuleZLib>;
