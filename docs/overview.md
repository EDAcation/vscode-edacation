# Overview

written in typescript.

this extension is designed to run in two environments:

- a normal desktop VS Code extension host (node.js available)
- a web extension host (node.js unavailable)

that constraint drives a lot of the architecture.

### repo map

- `src/extension/`: the extension host code
  - entrypoint: `src/extension/index.ts`
  - pattern: most features are registered by iterating over `commands/`, `editors/`, `tasks/`, `trees/`, `webviews/`
- `src/views/`: webview UI code (Vue)
  - each view has its own entrypoint (bundled to `dist/views/...`)
  - shared webview-side infra lives in `src/views/project.ts` and `src/views/vscode-wrapper.ts`
- `src/workers/`: a single worker that executes tools (mostly WebAssembly)
  - worker entrypoint: `src/workers/tool.ts`
- `src/common/`: shared cross-runtime utilities
  - `src/common/node-modules.ts`: guards access to node-only APIs
  - `src/common/universal-worker.ts`: worker abstraction for node + browser
  - `src/common/messages.ts`: message types between extension <-> worker

### the main architectural decisions

#### 1) project state is a shared, typed event stream

the extension wants all UIs (sidebars + editors) to stay in sync with "what projects are open" and "which project is current".

we do this using the exchange framework in `src/exchange.ts`.
it is explained in more detail in [communication.md](./communication.md) and [projects.md](./projects.md).

key entrypoints:

- exchange implementation: `src/exchange.ts`
- state hub (primary exchanges + persistence): `src/extension/projects/projects.ts`
- project model wrapper (eventing + serialization + disk IO): `src/extension/projects/project.ts`

#### 2) tools run through a single execution stack

yosys/nextpnr/openFPGALoader etc can run in different ways depending on the environment:

- in web: run WebAssembly bundles inside a web worker
- in desktop: prefer host tools if installed, otherwise use managed downloads, otherwise fall back to WebAssembly

this decision is centralized in `src/extension/tasks/toolprovider.ts`.
more detail in [tools-and-tasks.md](./tools-and-tasks.md).

#### 3) webviews are “thin” and subscribe to shared state

webviews do not directly read workspace state.
instead they subscribe to exchanges over the VS Code webview messaging channel.

key entrypoints:

- extension-side base: `src/extension/webview.ts`
- webview providers: `src/extension/webviews/*`
- webview-side shared state: `src/views/project.ts`

### build / bundling

- bundler: `webpack.config.mjs`
  - note: this repo produces multiple bundles (extension host + each view + worker)
- typescript:
  - root tsconfig: `tsconfig.json`
  - view tsconfig: `src/views/tsconfig.json` (different JS environment)

see also:

- [extension.md](./extension.md)
- [views.md](./views.md)
- [worker.md](./worker.md)
