# Worker

tool worker

we run some FPGA tools (yosys / nextpnr / openFPGALoader) in a worker.
the goal is:

- keep the extension host responsive
- support the web extension host (no native binaries)

the worker entrypoint is `src/workers/tool.ts`.

### message protocol

messages are defined in `src/common/messages.ts`.

- extension -> worker:
	- `WorkerMessageInput` contains `command`, `args` and a list of input files
- worker -> extension:
	- `terminal` (stdout/stderr output)
	- `output` (generated files)
	- `error`

the extension-side code that drives this is the `WebAssemblyToolProvider` in `src/extension/tasks/toolprovider.ts`.

### how the worker executes tools

at a high level:

1. validate and sanitize file paths (`sanitizePaths`)
2. convert input files into a simple directory tree (`arrayToTree`)
3. download a tool bundle from a CDN (currently jsdelivr)
4. dynamically import the bundle and run the command
5. convert the output tree back into a flat list (`arrayToList`) and send it back

the worker intentionally rejects absolute paths and some relative paths.
this keeps the “virtual file system” model simple and avoids surprising writes.

### universal-worker (node + browser)

in desktop VS Code we can use `worker_threads`.
in web we need a `Worker`.

`src/common/universal-worker.ts` abstracts over both and provides:

- `UniversalWorker` class (extension side)
- `sendMessage` / `onEvent` helpers (worker side)
- `importModule()` helper used by the tool worker to import bundles in node contexts

note: `importModule()` is a compatibility hack to load ESM-ish bundles in node-based worker environments.
it’s worth treating it as “special” code; avoid copying it elsewhere unless you really need to.