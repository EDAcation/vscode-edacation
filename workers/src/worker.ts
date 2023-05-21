import path from 'path';

import {ExtensionMessage, MessageFile, WorkerMessage} from './messages';

export const run = () => {
    console.log('run');
};

export type EmscriptenFS = typeof FS;

export interface EmscriptenWrapper {
    getFS(): EmscriptenFS;
}

export abstract class WorkerTool<Tool extends EmscriptenWrapper> {

    private toolPromise: Promise<Tool>;
    private tool?: Tool;

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

    protected async fetchBinary(url: string): Promise<ArrayBuffer> {
        const response = await fetch(url);
        return await response.arrayBuffer();
    }

    protected send(message: ExtensionMessage, transferables: Transferable[] = []) {
        postMessage(message, transferables);
    }

    protected print(stream: 'stdout' | 'stderr', data: string) {
        if (data.startsWith('warning: unsupported syscall:')) {
            return;
        }

        this.send({
            type: 'terminal',
            stream,
            data
        });
    }

    protected error(error: unknown) {
        this.send({
            type: 'error',
            error: error instanceof Error || typeof error === 'string' ? error : 'Unknown error'
        });
    }

    private async handleMessage(event: MessageEvent<WorkerMessage>) {
        try {
            switch (event.data.type) {
                case 'input': {
                    // Obtain Emscripten tool and its FS
                    const tool = await this.getTool();
                    const fs = await this.getFS();

                    // Write input files
                    for (const file of event.data.inputFiles) {
                        if (file.path.startsWith('/')) {
                            throw new Error('Absolute file paths are currently not supported.');
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

                    // TODO: create output directories

                    // Execute Emscripten tool
                    // @ts-ignore: TODO
                    tool.getModule().callMain(event.data.args);

                    // Read output files
                    const files: MessageFile[] = [];
                    for (const outputFilePath of event.data.outputFiles) {
                        files.push({
                            path: outputFilePath,
                            data: fs.readFile(outputFilePath)
                        });
                    }

                    // Send output to extension
                    this.send({
                        type: 'output',
                        files
                    }, files.map((file) => file.data.buffer));

                    break;
                }
            }
        } catch (err) {
            this.error(err);
        }
    }

    private handleMessageError(event: MessageEvent) {
        console.error('Message error:', event);

        this.error(new Error('Message error'));
    }
}
