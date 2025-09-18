import {type ProjectState} from 'edacation';
import {URI} from 'vscode-uri';

import {Project} from './extension/projects';

interface BaseExchangeCommand {
    type: 'exchange';
    topic: string;
}

interface ExchangeCommandRequestInit extends BaseExchangeCommand {
    command: 'requestInit';
}

interface ExchangeCommandUpdate<SerializedMessage> extends BaseExchangeCommand {
    command: 'update';
    value: SerializedMessage;
}

export type ExchangeCommand<SerializedMessage> = ExchangeCommandRequestInit | ExchangeCommandUpdate<SerializedMessage>;

interface ExchangeOptions {
    isPrimary: boolean;
}

export class ExchangeChannel<Message, SerializedMessage> {
    private readonly exchange: Exchange<Message, SerializedMessage>;

    public readonly callbacks: Set<(message: Message) => void>;

    constructor(exchange: Exchange<Message, SerializedMessage>) {
        this.exchange = exchange;
        this.callbacks = new Set();
    }

    subscribe(callback: (message: Message) => void, recvLastMessage = true): () => void {
        this.callbacks.add(callback);

        const lastMsg = this.exchange.getLastMessage();
        if (recvLastMessage && lastMsg.initialized) callback(lastMsg.message);

        return () => this.callbacks.delete(callback);
    }

    submit(message: Message) {
        // If this channel is on a secondary exchange that has not yet been initialized, messages should NOT propagate.
        // Doing this could potentially overwrite data in the primary exchange.
        // Instead, the `requestInit` message should have sent a request to the primary exchange by now, which
        // will share its last message with us. We MUST wait for an update from the primary exchange
        // in order to keep the exchanges synced.
        if (!this.exchange.options.isPrimary && !this.exchange.getLastMessage().initialized) return;

        this.exchange.broadcast(this, message);
    }

    destroy() {
        this.callbacks.clear();
        this.exchange.destroyChannel(this);
    }
}

export class ExchangePortal<Message, SerializedMessage> {
    private readonly exchange: Exchange<Message, SerializedMessage>;

    private sendCallback: (m: ExchangeCommand<SerializedMessage>) => void;

    constructor(
        exchange: Exchange<Message, SerializedMessage>,
        sendCallback: (m: ExchangeCommand<SerializedMessage>) => void
    ) {
        this.exchange = exchange;
        this.sendCallback = sendCallback;
    }

    private isExchangeMessage(obj: any): obj is ExchangeCommand<SerializedMessage> {
        return obj && typeof obj === 'object' && obj.type === 'exchange';
    }

    transmit(message: ExchangeCommand<SerializedMessage>) {
        this.sendCallback(message);
    }

    handleMessage(message: SerializedMessage) {
        if (!this.isExchangeMessage(message) || message.topic !== this.exchange.topic) return;

        if (message.command === 'requestInit') {
            // Init requested by secondary portal, only respond if we are primary
            if (!this.exchange.options.isPrimary) return;

            // Do not send anything if we haven't initialized yet
            const lastMsg = this.exchange.getLastMessage();
            if (!lastMsg.initialized) return;

            // Emit last known value back to secondary exchange
            const payload = this.exchange.getPortalPayload(lastMsg.message);
            this.transmit(payload);
        } else if (message.command === 'update') {
            // New value from other side of portal
            this.exchange.broadcast(this, this.exchange.deserialize(message.value));
        }
    }

    detach() {
        this.exchange.detachPortal(this);
    }
}

export class Exchange<Message, SerializedMessage> {
    private channels: Set<WeakRef<ExchangeChannel<Message, SerializedMessage>>> = new Set();
    private portals: Set<WeakRef<ExchangePortal<Message, SerializedMessage>>> = new Set();

    private lastMessage: {initialized: false} | {initialized: true; message: Message} = {initialized: false};

    public readonly topic: string;
    public readonly serialize: (m: Message) => SerializedMessage;
    public readonly deserialize: (v: SerializedMessage) => Message;
    public readonly options: ExchangeOptions;

    constructor(
        topic: string,
        serialize: (m: Message) => SerializedMessage,
        deserialize: (v: SerializedMessage) => Message,
        options: ExchangeOptions = {isPrimary: false}
    ) {
        this.topic = topic;
        this.serialize = serialize;
        this.deserialize = deserialize;
        this.options = options;
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
        sendCallback: (value: ExchangeCommand<SerializedMessage>) => void
    ): ExchangePortal<Message, SerializedMessage> {
        const portal = new ExchangePortal(this, sendCallback);
        this.portals.add(new WeakRef(portal));

        if (this.options.isPrimary && this.lastMessage.initialized) {
            // Primary exchange: emit last message into new portals if initialized
            const payload = this.getPortalPayload(this.lastMessage.message);
            portal.transmit(payload);
        } else if (!this.options.isPrimary && !this.lastMessage.initialized) {
            // Secondary exchange: send request for initial message if not initialized
            const payload = this.getInitPayload();
            portal.transmit(payload);
        }

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
        this.lastMessage = {
            initialized: true,
            message
        };

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

        const portalPayload: ExchangeCommand<SerializedMessage> = this.getPortalPayload(message);
        for (const portalRef of this.portals) {
            const portal = portalRef.deref();
            if (portal === undefined || portal === source) continue;

            portal.transmit(portalPayload);
        }
    }

    getPortalPayload(message: Message): ExchangeCommandUpdate<SerializedMessage> {
        return {
            type: 'exchange',
            topic: this.topic,
            command: 'update',
            value: this.serialize(message)
        };
    }

    getInitPayload(): ExchangeCommandRequestInit {
        return {
            type: 'exchange',
            topic: this.topic,
            command: 'requestInit'
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
export const createProjectEventExchange = (options?: ExchangeOptions): ProjectEventExchange => {
    const exchange = new ProjectEventExchange(
        'projectEvent',
        serializeProjectEvent,
        (value): ProjectEvent => deserializeProjectEvent(value, exchange.createChannel()),
        options
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
export const createOpenProjectsExchange = (
    options?: ExchangeOptions,
    projectEventExchange?: ProjectEventExchange
): OpenProjectsExchange => {
    return new OpenProjectsExchange(
        'openProjects',
        serializeOpenProjects,
        (value): ProjectsState => deserializeOpenProjects(value, projectEventExchange?.createChannel()),
        options
    );
};
