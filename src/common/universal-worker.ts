import type {TransferListItem} from 'worker_threads';

import type {ExtensionMessage, WorkerMessage} from './messages.js';

/* eslint-disable @typescript-eslint/consistent-type-imports */
type WorkerThreadsModule = typeof import('worker_threads');
type WorkerThreadsWorker = import('worker_threads').Worker;
/* eslint-enable @typescript-eslint/consistent-type-imports */

const module: WorkerThreadsModule | undefined =
    typeof Worker === 'undefined' ? __non_webpack_require__('worker_threads') : undefined;

type InternalNodeWorker = {
    type: 'node';
    worker: WorkerThreadsWorker;
};

type InternalWebWorker = {
    type: 'web';
    worker: Worker;
};

type InternalWorker = InternalNodeWorker | InternalWebWorker;

interface EventCallbacks {
    error: (err: Error) => void;
    messageerror: (err: Error) => void;
    message: ((message: ExtensionMessage) => void) | ((message: WorkerMessage) => void);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
