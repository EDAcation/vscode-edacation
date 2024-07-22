import * as vscode from 'vscode';

export enum AnsiModifier {
    RESET = '\x1b[0m',
    BOLD = '\x1b[1m',
    RED = '\x1b[31m',
    GREEN = '\x1b[32m',
    YELLOW = '\x1b[0;33m'
}

export interface TaskOutputFile {
    path: string;
    data?: Uint8Array;
    uri?: vscode.Uri;
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
    private messageEvent: vscode.EventEmitter<TerminalMessage> = new vscode.EventEmitter();

    public onMessage(callback: MessageCallback) {
        this.messageEvent.event(callback);
    }

    protected fire(message: TerminalMessage) {
        this.messageEvent.fire(message);
    }

    protected println(line = '', stream: 'stdout' | 'stderr' = 'stdout', modifier?: AnsiModifier) {
        this.fire({type: 'println', stream, line, modifier});
    }

    protected warn(line = '') {
        this.println(line, 'stderr', AnsiModifier.YELLOW);
    }

    protected error(error: unknown) {
        this.fire({type: 'error', error});
    }

    protected done(outputFiles?: TaskOutputFile[]) {
        this.fire({type: 'done', outputFiles});
    }
}
