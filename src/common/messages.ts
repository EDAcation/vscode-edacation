export interface MessageFile {
    path: string;
    data: Uint8Array;
}

export interface WorkerMessageInput {
    type: 'input';
    steps: {tool: string; arguments: string[]}[];
    inputFiles: MessageFile[];
}

export type WorkerMessage = WorkerMessageInput;

export interface ExtensionMessageTerminal {
    type: 'terminal';
    stream: 'stdout' | 'stderr';
    data: string;
}

export interface ExtensionMessageOutput {
    type: 'output';
    files: MessageFile[];
}

export interface ExtensionMessageError {
    type: 'error';
    error: Error | string;
}

export type ExtensionMessage = ExtensionMessageTerminal | ExtensionMessageOutput | ExtensionMessageError;
