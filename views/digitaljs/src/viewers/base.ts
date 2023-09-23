import type {View} from '../main';
import type {ForeignViewMessage, ViewMessage} from '../messages';

export abstract class BaseViewer<InitialData> {
    private readonly mainView: View;
    protected readonly data: InitialData;

    constructor(mainView: View, initData: InitialData) {
        this.mainView = mainView;
        this.data = initData;
    }

    abstract render(isUpdate: boolean): Promise<void>;

    abstract handleForeignViewMessage(message: ForeignViewMessage): void;

    protected get root(): HTMLDivElement {
        return this.mainView.root;
    }

    protected storeValue(name: string, value: object): Promise<void> {
        return this.mainView.storeValue(name, value);
    }

    protected getValue(name: string): Promise<object> {
        return this.mainView.getValue(name);
    }

    protected broadcastMessage(message: ForeignViewMessage) {
        return this.mainView.broadcastMessage(message);
    }

    protected sendMessage(message: ViewMessage) {
        return this.mainView.sendMessage(message);
    }

    protected handleError(error: unknown) {
        if (error instanceof Error || typeof error === 'string') {
            this.mainView.handleError(error);
        } else {
            this.mainView.handleError(new Error('Unknown error.'));
        }
    }
}
