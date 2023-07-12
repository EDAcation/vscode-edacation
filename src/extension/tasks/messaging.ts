export interface TaskOutputFile {
    path: string;
    data?: Uint8Array;
}

export interface TerminalMessagePrintln {
    type: 'println';
    stream: 'stdout' | 'stderr';
    line?: string;
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

    protected fire(message: TerminalMessage) {
        for (const callback of this.messageCallbacks) {
            callback(message);
        }
    }

    protected println(line = '', stream: 'stdout' | 'stderr' = 'stdout') {
        this.fire({type: 'println', stream, line});
    }

    protected error(error: unknown) {
        this.fire({type: 'error', error});
    }

    protected done(outputFiles?: TaskOutputFile[]) {
        this.fire({type: 'done', outputFiles});
    }
}
