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

    subscribe(callback: (message: Message) => void) {
        this.callbacks.add(callback);
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
    private channels: Set<ExchangeChannel<Message, SerializedMessage>> = new Set();
    private portals: Set<ExchangePortal<Message, SerializedMessage>> = new Set();

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

    createChannel() {
        const channel = new ExchangeChannel<Message, SerializedMessage>(this);
        this.channels.add(channel);
        return channel;
    }

    destroyChannel(channel: ExchangeChannel<Message, SerializedMessage>) {
        this.channels.delete(channel);
    }

    attachPortal(
        sendCallback: (value: ExchangeObjectWrapper<SerializedMessage>) => void
    ): ExchangePortal<Message, SerializedMessage> {
        const portal = new ExchangePortal(this, sendCallback);
        this.portals.add(portal);
        return portal;
    }

    detachPortal(portal: ExchangePortal<Message, SerializedMessage>) {
        this.portals.delete(portal);
    }

    broadcast(
        source: ExchangeChannel<Message, SerializedMessage> | ExchangePortal<Message, SerializedMessage>,
        message: Message
    ) {
        for (const channel of this.channels) {
            if (channel === source) continue;

            for (const cb of channel.callbacks) {
                try {
                    cb(message);
                } catch (e) {
                    console.error(e);
                }
            }
        }

        const portalPayload: ExchangeObjectWrapper<SerializedMessage> = this.getPortalPayload(message);
        for (const portal of this.portals) {
            if (portal === source) continue;

            portal.transmit(portalPayload);
        }
    }

    private getPortalPayload(message: Message): ExchangeObjectWrapper<SerializedMessage> {
        return {
            type: 'exchange',
            topic: this.topic,
            value: this.serialize(message)
        };
    }
}

// Open projects exchange
export interface ProjectsState {
    projects: Project[];
    currentProject: Project | undefined;
}
// TODO: FIX! Necessary for exchange portals support!
export type SerializedProjectsState = object;
export const serializeOpenProjects = (_projects: ProjectsState): SerializedProjectsState => {
    return {};
};
export const deserializeOpenProjects = (_value: SerializedProjectsState): ProjectsState => {
    return {projects: [], currentProject: undefined};
};
export class OpenProjectsExchange extends Exchange<ProjectsState, SerializedProjectsState> {}
export class OpenProjectsChannel extends ExchangeChannel<ProjectsState, SerializedProjectsState> {}
export class OpenProjectsPortal extends ExchangePortal<ProjectsState, SerializedProjectsState> {}
export const createOpenProjectsExchange = (): OpenProjectsExchange => {
    return new OpenProjectsExchange('openProjects', serializeOpenProjects, deserializeOpenProjects);
};

// Current project event exchange
export {Project};
export type ProjectEventType = 'full' | 'config' | 'inputFile' | 'outputFile';
export interface ProjectEvent {
    event: ProjectEventType;
    project: Project;
}
export interface SerializedProjectEvent {
    event: ProjectEventType;
    path: string;
    project: ProjectState;
}
export const serializeProjectEvent = (e: ProjectEvent): SerializedProjectEvent => {
    return {event: e.event, path: e.project.getUri().path, project: Project.serialize(e.project)};
};
export const deserializeProjectEvent = (value: SerializedProjectEvent, channel?: ProjectEventChannel): ProjectEvent => {
    return {event: value.event, project: Project.deserialize(value.project, URI.parse(value.path), channel)};
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
