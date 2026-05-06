# Extension

extension architecture

this extension is organized around a few “registries” of feature types:

- commands (`src/extension/commands/*`)
- custom editors (`src/extension/editors/*`)
- tasks (`src/extension/tasks/*`)
- tree views (`src/extension/trees/*`)
- sidebar webviews (`src/extension/webviews/*`)

the activation entrypoint is `src/extension/index.ts`.
it constructs a single `Projects` instance and then registers each of the feature types by iterating over the exports of the corresponding `index.ts` module.

if you add a new command/editor/task/tree/webview and it doesn’t show up, check that it is exported from the right `index.ts`.

### the “projects” singleton

`src/extension/projects/projects.ts` is effectively the state hub of the extension.
it owns:

- the list of open projects and the current project
- persistence in `context.workspaceState`
- file watchers that keep in-memory state synced with `*.edaproject` on disk
- the primary exchanges that broadcast project updates to the rest of the extension (trees, webviews, editors)

this is documented in [projects.md](./projects.md).

### running on desktop vs web

some parts of the extension can run without node.js.
when node.js is not available (web extension), we need different implementations for:

- tool execution (must use WebAssembly + worker)
- file system operations that require node APIs

places to look:

- `src/common/node-modules.ts` (the “is node available?” checks)
- `src/extension/tasks/toolprovider.ts` (selects between host/native-managed/web providers)
- `src/common/universal-worker.ts` (runs workers in node *or* browser)

### webview plumbing (extension side)

all webviews/editors ultimately render HTML from `BaseWebview` in `src/extension/webview.ts`.
important bits:

- `getHtmlForWebview()` injects `window.initialData` (optional)
- `connectWebview()` attaches exchange portals and routes `postMessage` traffic back into them

custom text editors use `BaseEditor` (`src/extension/editors/base.ts`).
sidebar webviews use `BaseWebviewViewProvider` (`src/extension/webviews/base.ts`).

### where to add a new feature (roughly)

- new command: subclass `BaseCommand` (`src/extension/commands/base.ts`)
- new sidebar view: subclass `BaseWebviewViewProvider` (`src/extension/webviews/base.ts`)
- new custom editor: subclass `BaseEditor` (`src/extension/editors/base.ts`)
- new tree: subclass `BaseTreeDataProvider` (`src/extension/trees/base.ts`)

don’t treat this as strict layering.
it’s just a common pattern in this repo: the extension host wires things up and the shared state flows through exchanges.
