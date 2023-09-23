import type {CustomElement} from './elements';
import type {Module, ModuleStatId} from './modules';

interface OverviewStatUpdateEvent {
    index: number;
    statId: ModuleStatId | null;
}

interface ModuleClickedEvent {
    module: Module;
}

interface ExplorerFocusUpdateEvent {
    module: Module;
}

interface CheckboxClickedEvent {
    id: ModuleStatId;
    checked: boolean;
}

interface CustomEvent<E> {
    element: CustomElement;
    data: E;
}

export interface CustomEvents {
    overviewGridStatUpdate: CustomEvent<OverviewStatUpdateEvent>;
    explorerModuleClicked: CustomEvent<ModuleClickedEvent>;
    explorerFocusUpdate: CustomEvent<ExplorerFocusUpdateEvent>;
    checkboxClicked: CustomEvent<CheckboxClickedEvent>;
}

export type CustomEventListener<K extends keyof CustomEvents> = (ev: CustomEvents[K]) => void;
