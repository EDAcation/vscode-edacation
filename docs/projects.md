# Projects

projects (state + persistence)

this repo treats “projects” as the central piece of shared state.
most UI surfaces (trees, sidebar views, editors) want to know:

- which projects are open
- which project is current
- when a project’s config changes

the state hub is `src/extension/projects/projects.ts`.

### projects.ts (state hub)

`Projects` is created once in `src/extension/index.ts` and passed to most feature types.
responsibilities:

- open/close projects (`add()` / `remove()`)
- keep `currentProject` updated (`setCurrent()`)
- persist open project list to `context.workspaceState` (key: `projects`)
- watch `**/*.edaproject` for changes/deletes
- broadcast state via exchanges

exchanges used:

- `projectEvent` exchange: “a project changed”
- `openProjects` exchange: “the set of open/current projects changed”

both exchanges are created as primary in `Projects` and are attached to webviews via portals.
see `src/exchange.ts` for the core exchange implementation.

implementation detail worth knowing:

- `ignoreSave` is used to avoid saving to disk when we just reloaded from disk.
  - flow: file watcher -> `reload(uri)` -> project updates -> exchange emits -> project save handler would run
  - `ignoreSave` is the guard that prevents that loop

### project.ts (model wrapper)

`src/extension/projects/project.ts` defines our `Project` class.
it extends the `Project` model from the `edacation` package, but adds VS Code integration:

- knows its `uri` and `root`
- reads/writes `*.edaproject` with `vscode.workspace.fs`
- bridges internal change events into the `projectEvent` exchange

two directions of change:

- internal changes:
  - base model emits internal events
  - our wrapper receives them in `onInternalEvent(...)`
  - it submits “this project instance changed” into its exchange channel

- external changes:
  - the wrapper subscribes to the exchange and receives *other* project instances
  - `onExternalEvent(...)` imports their config into the local project

channels are created lazily by `getChannel()`.
when a project instance is no longer needed (e.g. replaced in a view), callers should `detachChannel()`.

### where it shows up

examples of consumers that subscribe to these exchanges:

- tree views: `src/extension/trees/base.ts` (channels created for each tree)
- webviews: `src/extension/webview.ts` (portals attached to the webview messaging channel)
- webview-side shared store: `src/views/project.ts`
