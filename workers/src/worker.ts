export const run = () => {
    console.log('run');
};

export type EmscriptenFS = typeof FS;

export interface EmscriptenWrapper {
    getFS(): EmscriptenFS;
}

export abstract class WorkerTool<Tool extends EmscriptenWrapper> {

    private tool?: Tool;
    private fs?: EmscriptenFS;

    async getTool(): Promise<Tool> {
        if (!this.tool) {
            this.tool = await this.initialize();
        }
        return this.tool;
    }

    async getFS(): Promise<EmscriptenFS> {
        const tool = await this.getTool();
        return tool.getFS();
    }

    abstract initialize(): Promise<Tool>;

    abstract execute(): Promise<void>;
}
