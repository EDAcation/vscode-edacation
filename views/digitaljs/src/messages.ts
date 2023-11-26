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

interface ViewMessageRequestSave {
    type: 'requestSave';
    data: {
        fileContents: string;
        defaultPath?: string;
        filters?: Record<string, string[]>;
    };
}

export type ViewMessage = ViewMessageReady | ViewMessageChange | MessageBroadcast | ViewMessageRequestSave;

interface GlobalStore {
    type: 'globalStore';
    transaction: number;
}

interface GlobalStoreSet extends GlobalStore {
    action: 'set';
    name: string;
    value: object;
}

interface GlobalStoreGet extends GlobalStore {
    action: 'get';
    name: string;
}

interface GlobalStoreResult extends GlobalStore {
    action: 'result';
    result?: object;
}

export type GlobalStoreMessage = GlobalStoreSet | GlobalStoreGet | GlobalStoreResult;
