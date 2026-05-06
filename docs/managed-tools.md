# Managed Tools

managed native tools

on desktop VS Code, EDAcation can run native FPGA tools.
there are two native modes:

- host tools: rely on tools already installed in `PATH`
- managed tools: EDAcation downloads and manages its own tool installs

managed tools are *not* available in a web extension host.

### why managed tools exist

native tools are faster than WebAssembly, but they are a setup hurdle.
managed tools aim to make “native performance” work without asking users to install yosys/nextpnr manually.

### key pieces

- repository + state: `src/extension/tools/repository.ts` (`ToolRepository`)
- installed tool wrapper: `src/extension/tools/managedtool.ts` (`ManagedTool`)
- user commands: `src/extension/commands/tools.ts`
- provider integration: `src/extension/tasks/toolprovider.ts` (`ManagedToolProvider`)

### ToolRepository

`ToolRepository` owns:

- persisted state in `context.globalState` (`managedTools` key)
- install location in `context.globalStorageUri/managedTools/<toolId>`
- fetching the remote tool registry and caching it in-memory

registry:

- fetched from a GitHub release JSON (see `TOOLS_URL` in `ToolRepository`)
- filtered by OS/arch (`getPlatform()`)
- cached for a short period (`CACHE_EXPIRE_HRS`)

installation flow:

1. download a `.tar.gz`
2. stream it through gunzip + untar
3. strip the first top-level directory while extracting
4. update the stored tool settings and save state

### PATH injection

after install/uninstall, `ToolRepository.applyTerminalContributions()` prepends managed tool `bin/` and `lib/` paths to:

- `context.environmentVariableCollection`

this is important for two reasons:

- tasks can spawn managed binaries reliably
- user terminals opened in VS Code also see the tools in `PATH`

### ManagedTool

`ManagedTool` represents one installed tool version.
it provides:

- `getExecutionOptions(command)`
  - returns an `entrypoint` and a per-process `PATH` string
  - validates that the expected executable exists in `bin/`
- `isUpdateAvailable()` / `getLatestVersion()`
- `install()` / `uninstall()` convenience

`ManagedToolProvider` (in `src/extension/tasks/toolprovider.ts`) uses `getExecutionOptions()` to spawn tools.

### commands

managed tools are controlled via commands in `src/extension/commands/tools.ts`:

- `edacation.installTool`
  - installs selected tools, or resolves tool IDs from a provided command name
- `edacation.uninstallTool`
- `edacation.checkToolUpdates`
  - checks for updates and optionally triggers install of newer versions

there is also a user setting:

- `edacation.managedToolUpdateFrequency` (daily/weekly/monthly/never)

### how tasks choose managed tools

tool provider selection lives in `src/extension/tasks/toolprovider.ts`.

- `AutomaticToolProvider` prefers host tools if everything is available
- if not, it tries managed tools (and triggers install)
- if that still fails, it falls back to WebAssembly

the user can override this with:

- `edacation.toolProvider`: `native-managed`

note: `ManagedToolProvider.getToolStatuses()` triggers installs by calling the command `edacation.installTool`.
this keeps UI/UX (progress notifications) in the command layer rather than duplicating it in the provider.
