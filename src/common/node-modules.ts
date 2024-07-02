/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */

type Module = any; // TODO: refine?

const moduleCache = new Map<string, Module>();

const requireModule = (module: string): Module => {
    const cached = moduleCache.get(module);
    if (cached) return cached;

    console.log(`Requiring node module (CommonJS): ${module}`);

    const mod = __non_webpack_require__(module);
    moduleCache.set(module, mod);
    return mod;
};

export const isAvailable = (): boolean => typeof Worker === 'undefined';

export type ModuleChildProcess = typeof import('child_process');
export type ModuleFS = typeof import('fs');
export type ModuleOS = typeof import('os');
export type ModuleStream = typeof import('stream');
export type ModuleWorkerThreads = typeof import('worker_threads');
export type ModuleZLib = typeof import('zlib');

export const childProcess = () => requireModule('child_process') as ModuleChildProcess;
export const fs = () => requireModule('fs') as ModuleFS;
export const os = () => requireModule('os') as ModuleOS;
export const stream = () => requireModule('stream') as ModuleStream;
export const workerThreads = () => requireModule('worker_threads') as ModuleWorkerThreads;
export const zlib = () => requireModule('zlib') as ModuleZLib;
