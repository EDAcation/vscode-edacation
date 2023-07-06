export interface ViewMessageReady {
    type: 'ready';
}

export interface ViewMessageChange {
    type: 'change';
    document: string;
}

export interface ViewMessageRequestSave {
    type: 'requestSave';
    data: {
        fileContents: string;
        defaultPath?: string;
        filters?: Record<string, Array<string>>;
    };
}

export type ViewMessage = ViewMessageReady | ViewMessageChange | ViewMessageRequestSave;
