# Developer Documentation for EDAcation

goals:
  - explain overall extension architecture
  - help new developers get familiar with codebase
  - explain some important aspects in more detail

for user docs, go to https://edacation.github.io

---

this folder is intentionally short and incomplete.
think of it as a guided map of the codebase for new contributors.

recommended reading order:

- [overview.md](./overview.md) (high level map)
- [extension.md](./extension.md) (extension host architecture)
- [communication.md](./communication.md) (shared state + messaging patterns)
- [projects.md](./projects.md) (project model + state hub)
- [trees-and-commands.md](./trees-and-commands.md) (VS Code UI glue)
- [tasks.md](./tasks.md) (task execution pipeline)
- [tools-and-tasks.md](./tools-and-tasks.md) (running yosys/nextpnr/etc)
- [managed-tools.md](./managed-tools.md) (native tool installs)
- [views.md](./views.md) (webviews + custom editors)
- [custom-editors.md](./custom-editors.md) (custom editor lifecycle)
- [worker.md](./worker.md) (web worker that executes tools)

note: the docs should link to code, not duplicate it.
when writing new pages, prefer pointing to:

- the *entrypoint* for a subsystem ("where it starts")
- a *base class / interface* ("what the pattern looks like")
- one concrete implementation as an example

