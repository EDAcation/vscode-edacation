import type {Uri} from 'vscode';

export enum AnsiModifier {
    RESET = '\x1b[0m',
    BOLD = '\x1b[1m',
    RED = '\x1b[31m',
    GREEN = '\x1b[32m'
}

export interface TaskOutputFile {
    path: string;
    data?: Uint8Array;
    uri?: Uri;
}

export interface TerminalMessagePrintln {
    type: 'println';
    stream: 'stdout' | 'stderr';
    line?: string;
    modifier?: AnsiModifier;
}

export interface TerminalMessageError {
    type: 'error';
    error: unknown;
}

export interface TerminalMessageDone {
    type: 'done';
    outputFiles?: TaskOutputFile[];
}

export type TerminalMessage = TerminalMessagePrintln | TerminalMessageError | TerminalMessageDone;

type MessageCallback = (m: TerminalMessage) => void;

export abstract class TerminalMessageEmitter {
    private messageCallbacks: MessageCallback[];

    constructor() {
        this.messageCallbacks = [];
    }

    public onMessage(callback: MessageCallback) {
        this.messageCallbacks.push(callback);
    }

    private fire(message: TerminalMessage) {
        for (const callback of this.messageCallbacks) {
            callback(message);
        }
    }

    protected println(line = '', stream: 'stdout' | 'stderr' = 'stdout', modifier?: AnsiModifier) {
        this.fire({type: 'println', stream, line, modifier});
    }

    protected error(error: unknown) {
        this.fire({type: 'error', error});
    }

    protected done(outputFiles?: TaskOutputFile[]) {
        this.fire({type: 'done', outputFiles});
    }
}
