import {vscode} from '../../vscode';

import type {GlobalStoreMessage} from './messages';

interface TransactionSet {
    type: 'set';
    resolve: (value: void) => unknown;
}

interface TransactionGet {
    type: 'get';
    resolve: (value: object) => unknown;
}

type Transaction = TransactionSet | TransactionGet;

export class GlobalStoreConnector {
    private transactions: Record<number, Transaction>;

    constructor() {
        this.transactions = {};
    }

    private sendMessage(message: GlobalStoreMessage) {
        vscode.postMessage(message);
    }

    public onMessage(message: GlobalStoreMessage) {
        if (message.action !== 'result') {
            return;
        }

        const transaction = this.transactions[message.transaction];
        if (transaction === undefined) {
            // Not a critical error, so do not throw
            console.error(`GlobalState transaction ${transaction} not found!`);
            return;
        }

        if (transaction.type === 'set') {
            transaction.resolve();
        } else if (transaction.type === 'get') {
            transaction.resolve(message.result || {});
        }
    }

    public set(name: string, value: object): Promise<void> {
        const transUuid = Math.floor(Math.random() * 100_000);
        const promise = new Promise((resolve: (value: void) => unknown, _reject) => {
            this.transactions[transUuid] = {type: 'set', resolve};
        });

        this.sendMessage({
            type: 'globalStore',
            transaction: transUuid,
            action: 'set',
            name: name,
            value: value
        });

        return promise;
    }

    public get(name: string): Promise<object> {
        const transUuid = Math.floor(Math.random() * 100_000);
        const promise = new Promise((resolve: (value: object) => unknown, _reject) => {
            this.transactions[transUuid] = {type: 'get', resolve};
        });

        this.sendMessage({
            type: 'globalStore',
            transaction: transUuid,
            action: 'get',
            name: name
        });

        return promise;
    }
}
