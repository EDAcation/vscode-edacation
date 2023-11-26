export abstract class CustomElement<EventsDirectory> {
    protected abstract rootElem: HTMLElement;

    private eventsElem: Element;

    constructor() {
        this.eventsElem = document.createElement('events');
    }

    addEventListener<K extends keyof EventsDirectory & string>(type: K, listener: (ev: EventsDirectory[K]) => void) {
        this.eventsElem.addEventListener(type, (ev: CustomEventInit) => listener(ev.detail));
    }

    protected dispatchEvent<K extends keyof EventsDirectory & string>(type: K, data: EventsDirectory[K]) {
        this.eventsElem.dispatchEvent(new CustomEvent(type, {detail: data}));
    }

    get element() {
        return this.rootElem;
    }

    abstract render(): void;
}
