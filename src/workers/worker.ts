import path from 'path';

import type {ExtensionMessage, MessageFile, WorkerMessage} from '../common/messages.js';
import {onEvent, sendMessage} from '../common/universalworker.js';

export const run = () => {
    console.log('run');
};

export type EmscriptenFS = typeof FS;

export interface EmscriptenWrapper {
    getFS(): EmscriptenFS;
}

try {
    process.on('unhandledRejection', (err) => {
        throw err;
    });
} catch (err) {
    /* ignore */
}

export abstract class WorkerTool<Tool extends EmscriptenWrapper> {
    private toolPromise: Promise<Tool>;
    private tool?: Tool;

    constructor() {
        this.toolPromise = this.initialize();

        onEvent('message', this.handleMessage.bind(this));
        onEvent('messageerror', this.handleMessageError.bind(this));
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

    protected async fetchBinary(dataUrl: string): Promise<ArrayBuffer> {
        if (typeof Worker === 'undefined') {
            // Node.js - warning: only works for data URLs
            return Buffer.from(dataUrl.split(',')[1], 'base64');
        } else {
            // Web worker
            const response = await fetch(dataUrl);
            return await response.arrayBuffer();
        }
    }

    protected send(message: ExtensionMessage, transferables: Transferable[] = []) {
        sendMessage(message, transferables);
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
        console.trace(error);
        this.send({
            type: 'error',
            error: error instanceof Error || typeof error === 'string' ? error : 'Unknown error'
        });
    }

    private async handleMessage(message: WorkerMessage) {
        console.log('runner -> worker:');
        console.log(message);
        try {
            switch (message.type) {
                case 'input': {
                    console.log('We have input!');

                    // Obtain Emscripten tool and its FS
                    const tool = await this.getTool();
                    const fs = await this.getFS();

                    // Write input files
                    for (const file of message.inputFiles) {
                        console.log(file);
                        if (file.path.startsWith('/')) {
                            throw new Error('Absolute file paths are currently not supported.');
                        }

                        const dirname = path.dirname(file.path);
                        console.log(dirname);

                        let position = 0;
                        while (position < dirname.length) {
                            position = dirname.indexOf('/', position + 1);
                            console.log(position);
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
                    // @ts-expect-error: TODO
                    tool.getModule().callMain(message.args);

                    // Read output files
                    const files: MessageFile[] = [];
                    for (const outputFilePath of message.outputFiles) {
                        files.push({
                            path: outputFilePath,
                            data: fs.readFile(outputFilePath)
                        });
                    }

                    // Send output to extension
                    this.send(
                        {
                            type: 'output',
                            files
                        },
                        files.map((file) => file.data.buffer)
                    );

                    break;
                }
            }
        } catch (err) {
            this.error(err);
        }
    }

    private handleMessageError(error: Error) {
        console.error('Message error:', error);

        this.error(new Error('Message error'));
    }
}
