# Tasks

tasks (how execution works)

this repo uses VS Code tasks for “run yosys / nextpnr / simulate / flash”.

the task system has three layers:

1) VS Code integration (task provider)
2) terminal UI (pseudoterminal)
3) domain runner (a `TerminalTask` that calls a `ToolProvider`)

this split is deliberate:

- the VS Code layer discovers tasks and creates an execution
- the terminal layer owns the user-facing output and log files
- the domain layer owns “what to run” and “how to post-process outputs”

### 1) task providers (discovery + VS Code wiring)

files:

- `src/extension/tasks/base.ts` (`BaseTaskProvider`)
- `src/extension/tasks/terminal.ts` (`TaskProvider`)

important points:

- task types are contributed in `package.json` (`contributes.taskDefinitions`)
- the provider searches for `**/*.edaproject` and creates one VS Code task per target
- tasks use `vscode.CustomExecution` so we can provide our own pseudoterminal

`TaskProvider` caches discovered tasks in `taskPromise`.
there is also a file watcher that invalidates the cache when a project file changes.

implementation detail:

- `resolveTask(...)` is used when VS Code needs to rehydrate a task from stored definition

examples of concrete providers:

- `src/extension/tasks/yosys.ts` (`YosysTaskProvider`)
- `src/extension/tasks/nextpnr.ts` (`NextpnrTaskProvider`)

### 2) TaskTerminal (pseudoterminal + logging)

file:

- `src/extension/tasks/terminal.ts` (`TaskTerminal`)

`TaskTerminal` implements `vscode.Pseudoterminal`.
it’s responsible for:

- opening the “terminal UI” for a task run (`open()`)
- printing lines with ANSI modifiers (colors, bold)
- collecting a log buffer and writing it to `logs/<task>.log` on exit
- adding the log file to the project’s output file list

it also owns the “task lifecycle”:

- get the current project once
- ensure target directories are up-to-date (`project.updateTargetDirectories()`)
- call `TerminalTask.handleStart(project)`
- call `TerminalTask.execute(project, targetId)`
- wait for a `done` event
- call `TerminalTask.handleEnd(project, workerOptions, outputFiles)`
- add output files to the project and exit

### 3) TerminalTask (domain runner)

file:

- `src/extension/tasks/task.ts` (`TerminalTask`)

`TerminalTask` is where “what to run” is defined.
subclasses define:

- `getWorkerOptions(project, targetId)`
  - usually calls into the `edacation` package for the toolchain plan
- `getWorkerSteps(workerOptions)`
- input/output file lists
- optional post-processing in `handleStepEnd(...)` or `handleEnd(...)`

example tasks:

- `src/extension/tasks/yosys.ts` modifies JSON outputs to add extra fields
- `src/extension/tasks/nextpnr.ts` merges report data into the routed output

### how output gets from tools to the UI

there is a small message bus used inside tasks:

- `src/extension/tasks/messaging.ts` (`TerminalMessageEmitter`)

`TerminalTask` emits:

- `println` (stdout/stderr line)
- `error`
- `done` (optionally with output file list)

`TaskTerminal` subscribes once, then translates these into terminal output and lifecycle actions.

### where tools actually run

`TerminalTask.execute()` delegates to a `ToolProvider`.

file:

- `src/extension/tasks/toolprovider.ts`

providers include:

- `WebAssemblyToolProvider` (worker-based, works in web + desktop)
- `HostToolProvider` (spawn host binaries)
- `ManagedToolProvider` (spawn managed binaries installed by EDAcation)
- `AutomaticToolProvider` (selects the best available)

see also:

- [tools-and-tasks.md](./tools-and-tasks.md) (overview)
- [managed-tools.md](./managed-tools.md) (native tools management)
- [worker.md](./worker.md) (worker execution)
