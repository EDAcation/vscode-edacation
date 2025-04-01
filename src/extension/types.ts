interface ForeignViewMessageModuleFocus {
    type: 'moduleFocus';
    breadcrumbs: string[];
}

export type ForeignViewMessage = ForeignViewMessageModuleFocus;

interface MessageBroadcast {
    type: 'broadcast';
    message: ForeignViewMessage;
}

interface EditorMessageDocument {
    type: 'document';
    document: string;
}

export type EditorMessage = EditorMessageDocument | MessageBroadcast;

interface ViewMessageReady {
    type: 'ready';
}

interface ViewMessageChange {
    type: 'change';
    document: string;
}

interface ViewMessageCommand {
    type: 'command';
    command: string;
    args?: [];
}

interface ViewMessageChangeTLM {
    type: 'changeTlm';
    module: string;
    targetId: string;
}

interface ViewMessageChangeTestbench {
    type: 'changeTestbench';
    testbenchPath: string;
    targetId: string;
}

interface ViewMessageRequestSave {
    type: 'requestSave';
    data: {
        fileContents: string;
        defaultPath?: string;
        filters?: Record<string, string[]>;
    };
}

export type ViewMessage =
    | ViewMessageReady
    | ViewMessageCommand
    | ViewMessageChangeTLM
    | ViewMessageChangeTestbench
    | ViewMessageChange
    | MessageBroadcast
    | ViewMessageRequestSave;

interface GlobalStore {
    type: 'globalStore';
}

interface GlobalStoreSet extends GlobalStore {
    action: 'set';
    transaction: string;
    name: string;
    value: object;
}

interface GlobalStoreGet extends GlobalStore {
    action: 'get';
    transaction: string;
    name: string;
}

interface GlobalStoreResult extends GlobalStore {
    action: 'result';
    transaction: string;
    result?: object;
}

export type GlobalStoreMessage = GlobalStoreSet | GlobalStoreGet | GlobalStoreResult;
