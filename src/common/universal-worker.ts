/* This module is committing so many crimes we might as well disable ESLint for the entire file */

/* eslint-disable */
import type {TransferListItem} from 'worker_threads';

import type {ExtensionMessage, WorkerMessage} from './messages.js';
import * as node from './node-modules.js';

const module: node.ModuleWorkerThreads | undefined = node.isAvailable() ? node.importSync('worker_threads') : undefined;

interface InternalNodeWorker {
    type: 'node';
    worker: InstanceType<node.ModuleWorkerThreads['Worker']>;
}

interface InternalWebWorker {
    type: 'web';
    worker: Worker;
}

type InternalWorker = InternalNodeWorker | InternalWebWorker;

interface EventCallbacks {
    error: (err: Error) => void;
    messageerror: (err: Error) => void;
    message: ((message: ExtensionMessage) => void) | ((message: WorkerMessage) => void);
}

const extractData = (event: MessageEvent | ErrorEvent): any => {
    if (event instanceof MessageEvent) {
        return event.data;
    }
    return event;
};

export class UniversalWorker {
    private worker: InternalWorker;

    constructor(url: string | URL, options?: WorkerOptions) {
        if (typeof url === 'string') {
            url = new URL(url);
        }

        if (module) {
            console.log('Creating Node.js worker');
            this.worker = {
                type: 'node',
                worker: new module.Worker(url, options)
            };
        } else {
            console.log('Creating Web Worker');
            this.worker = {
                type: 'web',
                worker: new Worker(url, options)
            };
        }
    }

    public onEvent<E extends keyof EventCallbacks>(event: E, callback: EventCallbacks[E]): void {
        if (this.worker.type === 'web') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            this.worker.worker.addEventListener(event, (event) => callback(extractData(event)));
        } else {
            this.worker.worker.on(event, callback);
        }
    }

    public sendMessage(
        message: WorkerMessage,
        transferList?: StructuredSerializeOptions & readonly TransferListItem[]
    ) {
        this.worker.worker.postMessage(message, transferList);
    }
}

export const sendMessage = (message: ExtensionMessage, transferables: readonly TransferListItem[] & Transferable[]) => {
    if (module) {
        module.parentPort?.postMessage(message, transferables);
    } else {
        postMessage(message, transferables);
    }
};

export const onEvent = <E extends keyof EventCallbacks>(event: E, callback: EventCallbacks[E]): void => {
    if (module) {
        module.parentPort?.on(event, callback);
    } else {
        addEventListener(event, (event) => callback(extractData(event)));
    }
};

// (c) Catherine, ISC licensed (thanks!)
// https://github.com/YoWASP/vscode/blob/main/src/workerThread.ts
//
// TODO: revisit once vscode's electron ships Node >18.19.0
export const importModule = async (url: URL | string): Promise<any> => {
    if (module) {
        const vm = __non_webpack_require__('node:vm');

        let code = await fetch(url).then((resp) => resp.text());
        code = code.replace(/\bimport\.meta\.url\b/g, JSON.stringify(url));
        code = code.replace(/\bawait import\b/g, 'await _import');
        code = code.replace(/\(\) => import/g, '() => _import');
        code = code.replace(/\bexport const\b/g, 'exports.');
        code = code.replace(
            /\bexport\s*{([^}]+)}\s*;/g,
            (_match, args) => `exports={${args.replace(/(\w+)\s+as\s+(\w+)/g, '$2:$1')}};`
        );
        const script = new vm.Script(code, {
            filename: url.toString()
        });
        const context: any = {
            location: {
                href: url.toString(),
                toString() {
                    return url.toString();
                }
            },
            _import: (innerURL: string) => importModule(new URL(innerURL, url)),
            exports: {},
            globalThis
        };
        context.self = context;
        Object.setPrototypeOf(context, globalThis);
        script.runInNewContext(context, {contextOrigin: url.toString()});
        return context.exports;
    } else {
        return await import(/* webpackIgnore: true */ url.toString());
    }
};
