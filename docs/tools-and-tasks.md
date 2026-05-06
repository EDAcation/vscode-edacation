# Tools And Tasks

tools and tasks (execution stack)

this extension can run toolchains in multiple environments:

- desktop VS Code: native processes can be spawned
- web VS Code: native processes are unavailable

to keep the rest of the codebase simple, tool execution is centralized.

the key files are:

- `src/extension/tasks/task.ts` (`TerminalTask` base)
- `src/extension/tasks/toolprovider.ts` (selects and runs a tool provider)
- `src/extension/tools/repository.ts` (managed tool downloads)
- `src/workers/tool.ts` (web worker that runs WebAssembly tool bundles)

this page is an overview.
for a deeper explanation of the task pipeline, see [tasks.md](./tasks.md).
for managed/native tool installs, see [managed-tools.md](./managed-tools.md).

### tasks are mostly “plans” + IO mapping

in this repo, a task typically defines:

- a list of steps (`WorkerStep[]` from the `edacation` package)
- which files are inputs vs outputs
- how to update the project once outputs exist

`TerminalTask.execute()` (in `src/extension/tasks/task.ts`) is a good reference:

- it pretty-prints inputs/outputs
- it delegates execution to a `ToolProvider`
- it emits terminal-style messages instead of writing directly to a terminal

terminal output is modeled as events in `src/extension/tasks/messaging.ts` (`TerminalMessageEmitter`).

### tool providers

`src/extension/tasks/toolprovider.ts` defines multiple tool providers:

- `WebAssemblyToolProvider`:
  - runs steps by sending messages to `dist/workers/tool.js`
  - writes produced files back into the workspace
- `HostToolProvider`:
  - runs tools found in `PATH` (desktop only)
- `ManagedToolProvider`:
  - runs tools installed by EDAcation into global storage
  - auto-installs missing tools by calling `edacation.installTool`
- `AutomaticToolProvider`:
  - chooses the best provider for the current environment

provider selection is controlled by a user setting:

- `edacation.toolProvider`: `auto` | `native-managed` | `native-host` | `web`

note: in a web extension host, we always fall back to WebAssembly.

### managed tools repository

`src/extension/tools/repository.ts` (`ToolRepository`) is responsible for:

- reading/writing the installed tool list from `context.globalState`
- downloading and unpacking tools into `context.globalStorageUri`
- prepending the tool `bin/` directories into VS Code’s terminal PATH via `environmentVariableCollection`

this is a deliberate design choice:

- tasks can assume tools exist after install
- terminals launched by the user also get the right PATH, so manual commands work

### the worker

the tool worker (`src/workers/tool.ts`) is used by the `WebAssemblyToolProvider`.
it downloads tool bundles (currently YoWASP packages) and executes them in the worker.

message formats live in `src/common/messages.ts`.
worker portability is handled by `src/common/universal-worker.ts`.
