import * as vscode from 'vscode';

export class ExchangeChannel<Message> {
    public readonly eventEmitter: vscode.EventEmitter<Message>;

    private readonly exchange: Exchange<Message>;

    constructor(exchange: Exchange<Message>) {
        this.eventEmitter = new vscode.EventEmitter();

        this.exchange = exchange;
    }

    subscribe(callback: (message: Message) => void) {
        this.eventEmitter.event(callback);
    }

    submit(message: Message) {
        this.exchange.broadcast(this, message);
    }

    destroy() {
        this.eventEmitter.dispose();
    }
}

export class Exchange<Message> {
    private channels: Set<ExchangeChannel<Message>> = new Set();

    createChannel() {
        const channel = new ExchangeChannel(this);
        this.channels.add(channel);
        return channel;
    }

    destroyChannel(channel: ExchangeChannel<Message>) {
        this.channels.delete(channel);
    }

    broadcast(source: ExchangeChannel<Message>, message: Message) {
        for (const channel of this.channels) {
            if (channel === source) continue;

            channel.eventEmitter.fire(message);
        }
    }
}
