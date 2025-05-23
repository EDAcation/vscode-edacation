/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */

type Module = any; // TODO: refine?

const moduleCache = new Map<string, Module>();

const requireModule = (module: string, fallbackModule?: Module): Module => {
    if (!isAvailable()) {
        if (!fallbackModule) throw new Error('Native features cannot be used in a web environment!');

        console.log(`Using module fallback for ${module}`);
        return fallbackModule;
    }

    const cached = moduleCache.get(module);
    if (cached) return cached;

    console.log(`Requiring node module: ${module}`);

    const mod = __non_webpack_require__(module);
    moduleCache.set(module, mod);
    return mod;
};

export const isAvailable = (): boolean => typeof Worker === 'undefined';

export type ModuleChildProcess = typeof import('child_process');
export type ModuleFS = typeof import('fs');
export type ModuleOS = typeof import('os');
export type ModuleProcess = typeof import('process');
export type ModuleStream = typeof import('stream');
export type ModuleWhich = typeof import('which');
export type ModuleWorkerThreads = typeof import('worker_threads');
export type ModuleZLib = typeof import('zlib');

export const childProcess = () => requireModule('child_process') as ModuleChildProcess;
export const fs = () => requireModule('fs') as ModuleFS;
export const os = () => requireModule('os') as ModuleOS;
export const process = () => requireModule('process') as ModuleProcess;
export const stream = () => requireModule('stream') as ModuleStream;
export const which = () => require('which') as ModuleWhich;
export const workerThreads = () => requireModule('worker_threads') as ModuleWorkerThreads;
export const zlib = () => requireModule('zlib') as ModuleZLib;

// Conditional shims - resolve to native module where possible, fallback otherwise
// Practically identical to Webpack's fallback functionality, except this allows us to create globals through ProvidePlugin
export const csProcess = requireModule('process', require('process/browser'));
