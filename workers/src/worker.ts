import path from 'path';

export const run = () => {
    console.log('run');
};

export type EmscriptenFS = typeof FS;

export interface EmscriptenWrapper {
    getFS(): EmscriptenFS;
}

export interface ToolMessageInput {
    type: 'input';
    files: {
        path: string;
        data: Uint8Array;
    }[];
}

export type ToolMessage = ToolMessageInput;

export abstract class WorkerTool<Tool extends EmscriptenWrapper> {

    private toolPromise: Promise<Tool>;
    private tool?: Tool;
    private fs?: EmscriptenFS;

    constructor() {
        this.toolPromise = this.initialize();

        addEventListener('message', this.handleMessage.bind(this));
        addEventListener('messageerror', this.handleMessageError.bind(this));
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

    private async handleMessage(event: MessageEvent<ToolMessage>) {
        switch (event.data.type) {
            case 'input': {
                // TODO: input
                console.log(event.data);

                const fs = await this.getFS();

                // Write files
                for (const file of event.data.files) {
                    if (file.path.startsWith('/')) {
                        continue;
                    }

                    const dirname = path.dirname(file.path);
                    console.log(dirname);

                    let position = 0;
                    while (position < dirname.length) {
                        position = dirname.indexOf('/', position + 1);
                        if (position === -1) {
                            break;
                        }

                        const directoryPath = dirname.substring(0, position);
                        console.log('checking', directoryPath);

                        try {
                            fs.stat(directoryPath);
                        } catch (err) {
                            fs.mkdir(directoryPath);
                        }

                        console.log(fs.readdir(directoryPath));
                    }

                    console.log('dirs exist');

                    fs.writeFile(file.path, file.data);
                    console.log('file written');
                }

                await this.execute();

                // TODO: output

                break;
            }
        }
    }

    private handleMessageError(event: MessageEvent) {
        console.error('Message error:', event);
    }
}
