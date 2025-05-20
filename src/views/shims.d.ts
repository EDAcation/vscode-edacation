declare module '*.vue' {
    import type {defineComponent} from 'vue';
    const component: ReturnType<typeof defineComponent>;
    export default component;
}

declare var __non_webpack_require__: NodeRequire;
