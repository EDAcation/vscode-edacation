# Views

views (webviews)

we have 5 UI “surfaces” implemented as webviews:

- sidebar views (webview view providers):
  - `actions`
  - `config`
  - `project`
- custom editors (webview panels bound to a text document):
  - `yosys`
  - `nextpnr`

in the repo these live in two places:

- extension-side wiring (providers + HTML): `src/extension/webviews/*` and `src/extension/editors/*`
- webview-side UI code (Vue entrypoints): `src/views/*`

### base classes to know

- `src/extension/webview.ts` (`BaseWebview`)
  - common HTML template + asset resolution (`dist/views/...`)
  - attaches exchange portals so the view can subscribe to shared state
- `src/extension/webviews/base.ts` (`BaseWebviewViewProvider`)
  - wraps a sidebar webview and also supports “show as panel” (some views can be opened as normal panels)
  - tracks active panel instances (singleton vs multiple)
- `src/extension/editors/base.ts` (`BaseEditor`)
  - handles `ready`/`document` sync and basic global store messages
  - listens to `onDidChangeTextDocument` and pushes updates to the webview

### the shared “project” state in webviews

webviews can’t import `Projects` directly.
instead, they subscribe to exchanges over `postMessage`.

the shared webview-side glue code is `src/views/project.ts`:

- creates secondary exchanges (`createProjectEventExchange({isPrimary:false})`, etc)
- attaches portals and forwards messages to VS Code (`vscode.postMessage`)
- exposes channels + a small reactive store (`syncedState`) that UIs can use

`src/views/vscode-wrapper.ts` provides a small wrapper around `acquireVsCodeApi()`.
it also has a fallback mode (localStorage) so parts of the UI are easier to run outside VS Code.

### initial data

the extension can inject an initial JSON blob into `window.initialData`.
this comes from `BaseWebview.getHtmlForWebview()` (`src/extension/webview.ts`).

use this sparingly:

- it is good for “arguments” to a specific webview instance
- shared state should usually go through exchanges (so it stays live)

### examples

- a sidebar provider: `src/extension/webviews/project.ts`
- a custom editor: `src/extension/editors/yosys.ts`
- a view entrypoint: `src/views/yosys/main.ts`
