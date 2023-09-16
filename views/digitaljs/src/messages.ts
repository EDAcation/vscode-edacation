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
