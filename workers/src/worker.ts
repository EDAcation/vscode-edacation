export const run = () => {
    console.log('run');
};

export type EmscriptenFS = typeof FS;

export interface EmscriptenWrapper {
    getFS(): EmscriptenFS;
}

interface ToolMessageInput {
    type: 'input';
}

interface ToolMessageExecute {
    type: 'execute';
}

type ToolMessage = ToolMessageInput | ToolMessageExecute;

export abstract class WorkerTool<Tool extends EmscriptenWrapper> {

    private toolPromise: Promise<Tool>;
    private tool?: Tool;
    private fs?: EmscriptenFS;

    constructor() {
        this.toolPromise = this.initialize();

        addEventListener('message', this.onMessage);
        addEventListener('messageerror', this.onMessageError);
    }

    async getTool(): Promise<Tool> {
        if (!this.tool) {
            this.tool = await this.toolPromise;
        }
        return this.tool;
    }

    async getFS(): Promise<EmscriptenFS> {
        const tool = await this.getTool();
        return tool.getFS();
    }

    abstract initialize(): Promise<Tool>;

    abstract execute(): Promise<void>;

    protected async fetchBinary(url: string): Promise<ArrayBuffer> {
        const response = await fetch(url);
        return await response.arrayBuffer();
    }

    private async onMessage(event: MessageEvent<ToolMessage>) {
        switch (event.data.type) {
            case 'input': {
                // TODO: input
                console.log(event.data);

                break;
            }
            case 'execute': {
                await this.execute();

                // TODO: output

                break;
            }
        }
    }

    private onMessageError(event: MessageEvent) {
        console.error('Message error:', event);
    }
}
