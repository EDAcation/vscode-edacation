import {type ProjectState} from 'edacation';
import {URI} from 'vscode-uri';

import {Project} from './extension/projects';

export interface ExchangeObjectWrapper<SerializedMessage> {
    type: 'exchange';
    topic: string;
    value: SerializedMessage;
}

export class ExchangeChannel<Message, SerializedMessage> {
    private readonly exchange: Exchange<Message, SerializedMessage>;

    public readonly callbacks: Set<(message: Message) => void>;

    constructor(exchange: Exchange<Message, SerializedMessage>) {
        this.exchange = exchange;
        this.callbacks = new Set();
    }

    subscribe(callback: (message: Message) => void, recvLastMessage = true) {
        this.callbacks.add(callback);

        const lastMsg = this.exchange.getLastMessage();
        if (recvLastMessage && lastMsg !== undefined) callback(lastMsg);
    }

    submit(message: Message) {
        this.exchange.broadcast(this, message);
    }

    destroy() {
        this.callbacks.clear();
        this.exchange.destroyChannel(this);
    }
}

export class ExchangePortal<Message, SerializedMessage> {
    private readonly exchange: Exchange<Message, SerializedMessage>;

    private sendCallback: (m: ExchangeObjectWrapper<SerializedMessage>) => void;

    constructor(
        exchange: Exchange<Message, SerializedMessage>,
        sendCallback: (m: ExchangeObjectWrapper<SerializedMessage>) => void
    ) {
        this.exchange = exchange;
        this.sendCallback = sendCallback;
    }

    private isExchangeObjectWrapper(obj: any): obj is ExchangeObjectWrapper<SerializedMessage> {
        return (
            obj && typeof obj === 'object' && obj.type === 'exchange' && typeof obj.topic === 'string' && 'value' in obj
        );
    }

    transmit(message: ExchangeObjectWrapper<SerializedMessage>) {
        this.sendCallback(message);
    }

    handleMessage(message: SerializedMessage) {
        if (!this.isExchangeObjectWrapper(message) || message.topic !== this.exchange.topic) return;

        this.exchange.broadcast(this, this.exchange.deserialize(message.value));
    }

    detach() {
        this.exchange.detachPortal(this);
    }
}

export class Exchange<Message, SerializedMessage> {
    private channels: Set<WeakRef<ExchangeChannel<Message, SerializedMessage>>> = new Set();
    private portals: Set<WeakRef<ExchangePortal<Message, SerializedMessage>>> = new Set();

    private lastMessage?: Message;

    public readonly topic: string;
    public readonly serialize: (m: Message) => SerializedMessage;
    public readonly deserialize: (v: SerializedMessage) => Message;

    constructor(
        topic: string,
        serialize: (m: Message) => SerializedMessage,
        deserialize: (v: SerializedMessage) => Message
    ) {
        this.topic = topic;
        this.serialize = serialize;
        this.deserialize = deserialize;
    }

    getLastMessage() {
        return this.lastMessage;
    }

    createChannel() {
        const channel = new ExchangeChannel<Message, SerializedMessage>(this);
        this.channels.add(new WeakRef(channel));
        return channel;
    }

    destroyChannel(channel: ExchangeChannel<Message, SerializedMessage>) {
        for (const storedChannel of this.channels) {
            if (storedChannel.deref() === channel) {
                this.channels.delete(storedChannel);
                return;
            }
        }
    }

    attachPortal(
        sendCallback: (value: ExchangeObjectWrapper<SerializedMessage>) => void
    ): ExchangePortal<Message, SerializedMessage> {
        const portal = new ExchangePortal(this, sendCallback);
        this.portals.add(new WeakRef(portal));
        return portal;
    }

    detachPortal(portal: ExchangePortal<Message, SerializedMessage>) {
        for (const storedPortal of this.portals) {
            if (storedPortal.deref() === portal) {
                this.portals.delete(storedPortal);
                return;
            }
        }
    }

    broadcast(
        source: ExchangeChannel<Message, SerializedMessage> | ExchangePortal<Message, SerializedMessage>,
        message: Message
    ) {
        this.lastMessage = message;

        for (const chanRef of this.channels) {
            const channel = chanRef.deref();
            if (channel === undefined || channel === source) continue;

            for (const cb of channel.callbacks) {
                try {
                    cb(message);
                } catch (e) {
                    console.error(e);
                }
            }
        }

        const portalPayload: ExchangeObjectWrapper<SerializedMessage> = this.getPortalPayload(message);
        for (const portalRef of this.portals) {
            const portal = portalRef.deref();
            if (portal === undefined || portal === source) continue;

            portal.transmit(portalPayload);
        }
    }

    getPortalPayload(message: Message): ExchangeObjectWrapper<SerializedMessage> {
        return {
            type: 'exchange',
            topic: this.topic,
            value: this.serialize(message)
        };
    }
}

// Current project event exchange
export {Project};
export type ProjectEvent = Project;
export interface SerializedProjectEvent {
    path: string;
    project: ProjectState;
}
export const serializeProjectEvent = (project: ProjectEvent): SerializedProjectEvent => {
    return {path: project.getUri().path, project: Project.serialize(project)};
};
export const deserializeProjectEvent = (value: SerializedProjectEvent, channel?: ProjectEventChannel): ProjectEvent => {
    return Project.deserialize(value.project, URI.parse(value.path), channel);
};
export class ProjectEventExchange extends Exchange<ProjectEvent, SerializedProjectEvent> {}
export class ProjectEventChannel extends ExchangeChannel<ProjectEvent, SerializedProjectEvent> {}
export class ProjectEventPortal extends ExchangePortal<ProjectEvent, SerializedProjectEvent> {}
export const createProjectEventExchange = (): ProjectEventExchange => {
    const exchange = new ProjectEventExchange(
        'projectEvent',
        serializeProjectEvent,
        (value): ProjectEvent => deserializeProjectEvent(value, exchange.createChannel())
    );
    return exchange;
};

// Open projects exchange
export interface ProjectsState {
    projects: Project[];
    currentProject: Project | undefined;
}
export interface SerializedProjectsState {
    projects: SerializedProjectEvent[];
    currentProject: SerializedProjectEvent | undefined;
}
export const serializeOpenProjects = (projects: ProjectsState): SerializedProjectsState => {
    return {
        projects: projects.projects.map((project) => serializeProjectEvent(project)),
        currentProject: projects.currentProject ? serializeProjectEvent(projects.currentProject) : undefined
    };
};
export const deserializeOpenProjects = (
    value: SerializedProjectsState,
    channel?: ProjectEventChannel
): ProjectsState => {
    return {
        projects: value.projects.map((project) => deserializeProjectEvent(project, channel)),
        currentProject: value.currentProject ? deserializeProjectEvent(value.currentProject, channel) : undefined
    };
};
export class OpenProjectsExchange extends Exchange<ProjectsState, SerializedProjectsState> {}
export class OpenProjectsChannel extends ExchangeChannel<ProjectsState, SerializedProjectsState> {}
export class OpenProjectsPortal extends ExchangePortal<ProjectsState, SerializedProjectsState> {}
export const createOpenProjectsExchange = (projectEventExchange?: ProjectEventExchange): OpenProjectsExchange => {
    return new OpenProjectsExchange(
        'openProjects',
        serializeOpenProjects,
        (value): ProjectsState => deserializeOpenProjects(value, projectEventExchange?.createChannel())
    );
};
