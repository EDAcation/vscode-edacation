# Trees And Commands

trees and commands

this repo uses trees and commands as the “glue” between:

- the shared state hub (`Projects` + exchanges)
- VS Code UI integration (activity bar views, context menus)

this page is a short map of the patterns used.

### tree views

tree views are defined by:

- view contributions in `package.json` (`contributes.views`)
- implementations in `src/extension/trees/*`
- registration in `src/extension/index.ts` (iterates `src/extension/trees/index.ts`)

base class:

- `src/extension/trees/base.ts` (`BaseTreeDataProvider<T>`)

important idea:

- every tree provider creates its own `projectEventChannel` and `openProjectsChannel`
- providers subscribe to those and call `changeEmitter.fire(undefined)`
- this keeps trees up to date whenever the current project changes or a project config changes

example:

- `src/extension/trees/projects.ts` (`ProjectProvider`)

### files trees (input/output)

`src/extension/trees/files.ts` contains the input/output file trees.

what’s interesting here:

- the tree structure is derived from the *current project* only
- `contextValue` is used heavily to control which context-menu actions show up
  - see `package.json` → `contributes.menus.view/item/context`
  - example values:
    - `file` / `file-activatable`
    - `inputCategory`
    - `target` / `logs`

input files also implement drag & drop re-categorization:

- `InputFileTreeDragAndDropController` in `src/extension/trees/files.ts`
- the drop handler updates the `ProjectInputFile.type` directly
- the resulting project change flows back through the exchange and refreshes the tree

### commands

commands are declared in `package.json` (`contributes.commands`) and implemented in `src/extension/commands/*`.
they are registered in `src/extension/index.ts` by iterating exports from `src/extension/commands/index.ts`.

base classes:

- `src/extension/commands/base.ts` (`BaseCommand`)
- `src/extension/commands/base.ts` (`CurrentProjectCommand`)

`CurrentProjectCommand` is the default choice when:

- a command only makes sense with a selected project
- you want the command to short-circuit with a warning if no project is selected

examples:

- project lifecycle: `src/extension/commands/project.ts`
- file manipulation: `src/extension/commands/files.ts`

### commands that run tasks

some commands are basically “run the correct VS Code task for the current project” wrappers.

see `src/extension/commands/actions.ts`:

- fetch tasks using `vscode.tasks.fetchTasks({type: ...})`
- select the one matching the current project URI + target id
- run it via `vscode.tasks.executeTask(task)`

this design keeps a single source of truth:

- tasks are still owned by the task providers (and visible in VS Code’s tasks UI)
- commands just pick and execute the right one

related docs:

- [projects.md](./projects.md) (where current project comes from)
- [tasks.md](./tasks.md) (how tasks actually execute)
