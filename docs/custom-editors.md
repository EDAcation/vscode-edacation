# Custom Editors

custom editors are the “tab” experiences for rendered tool outputs.
in this repo they are used for:

- yosys output (`*.yosys.json`)
- nextpnr output (`*.nextpnr.json`)

### where they are declared

- `package.json` → `contributes.customEditors`
  - maps a `viewType` (e.g. `edacation.yosys`) to a filename pattern

### where they are registered

- registration happens in `src/extension/index.ts`
  - it iterates `src/extension/editors/index.ts` and calls `vscode.window.registerCustomEditorProvider(...)`

### the base lifecycle (extension host)

base class:

- `src/extension/editors/base.ts` (`BaseEditor`)

VS Code calls `resolveCustomTextEditor(document, webviewPanel, token)`.
our base implementation does:

1. render HTML
   - sets `webview.options.enableScripts = true`
   - sets `webview.html` via `BaseWebview.getHtmlForWebview(...)` (`src/extension/webview.ts`)

2. attach message handler
   - `webview.onDidReceiveMessage(...)` routes messages into `BaseEditor.onDidReceiveMessage(...)`

3. attach document lifecycle listeners
   - `workspace.onDidChangeTextDocument` → calls `update(...)`
     - note: it ignores the initial empty `contentChanges` to avoid a duplicate update on open
   - `workspace.onDidDeleteFiles` → disposes the editor tab if its backing document is deleted
   - `workspace.onDidSaveTextDocument` → calls `onSave(...)`

4. attach shared-state portals
   - calls `connectWebview(...)` / `disconnectWebview(...)` from `BaseWebview`
   - this connects the editor tab to the project/open-project exchanges

5. dispose
   - on panel dispose, `onClose(...)` runs and all listeners are disposed

### the handshake (webview side)

webviews send a “ready” message once they are able to receive the initial document.

- yosys: `src/views/yosys/main.ts` sends `{type: 'ready'}` if it has no cached state
- nextpnr: `src/views/nextpnr/main.ts` does the same

`BaseEditor.onDidReceiveMessage(...)` handles:

- `type: 'ready'` → responds with `{type: 'document', document: document.getText()}`

from that point on:

- any document edits in VS Code trigger `update(...)`
- `update(...)` posts a new `{type: 'document', ...}` message into the webview

### concrete editors

- `src/extension/editors/yosys.ts` (`YosysEditor`)
  - tracks `activeViews` so the webview can broadcast between open tabs
  - supports `requestSave` messages (exporting files)

- `src/extension/editors/nextpnr.ts` (`NextpnrEditor`)
  - a simpler editor: document in, render, resize

### global store messages

`BaseEditor` also handles a small “global store” message type:

- `type: 'globalStore'` with `action: 'get' | 'set'`

this uses `context.globalState` on the extension side.
the yosys view uses this via `GlobalStoreConnector` (`src/views/yosys/globalStore.ts`).

### why this is designed this way

a few intentional constraints show up here:

- the editor webview is treated as a separate process
- the source of truth is still the backing text document
- the webview requests the initial doc explicitly (`ready`) so we don’t race initialization
- exchange portals are attached even for editors, so tabs can follow project selection changes
