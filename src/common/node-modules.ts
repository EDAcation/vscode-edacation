/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */

type Module = any; // TODO: refine?

const moduleCache = new Map<string, Module>();

export const importModule = (module: string): Module => {
    const cached = moduleCache.get(module);
    if (cached) return cached;

    console.log(`Importing node module: ${module}`);

    const mod = __non_webpack_require__(module);
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

export const childProcess = async () => importModule('child_process') as ModuleChildProcess;
export const fs = async () => importModule('fs') as ModuleFS;
export const os = async () => importModule('os') as ModuleOS;
export const stream = async () => importModule('stream') as ModuleStream;
export const tar = async () => importModule('tar-fs') as ModuleTarFS;
export const workerThreads = async () => importModule('worker_threads') as ModuleWorkerThreads;
export const zlib = async () => importModule('zlib') as ModuleZLib;
