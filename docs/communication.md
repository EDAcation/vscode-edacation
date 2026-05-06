# Communication

framework for communication between views and extension

views are separate contexts and can only communicate with the main extension over serializable messages (JSON in practice)

however, sometimes you want to share data across all views and the extension (e.g. currently opened project)

that's where our framework comes in
- basic idea: 'exchanges' that pipe data around and ensure each subscriber is up to date

defined in src/exchange.ts

also see:

- extension-side portal wiring: `src/extension/webview.ts` (`BaseWebview.connectWebview()`)
- view-side portal wiring: `src/views/project.ts`

### more info

- exchanges created using a topic (unique string identifier), (de)serialization functions and some misc options
- the data is typed, so each exchange can only pipe around one specific data format
- exchanges can be connected across communication channels (called 'portals') such as the extension <-> webview communication channel - example of this in main extension projects.ts (attachPortal)
- one echange is the primary and the exchanges have a protocol (check implementation and explain a bit further) to ensure the other exchange is kept up to date correctly whenever a change occurs

### protocol notes (template)

the primary/secondary protocol is intentionally simple:

- exchanges remember the last broadcast value (`lastMessage`)
- when a secondary exchange attaches a portal and has no last message yet, it sends `{command:"requestInit"}`
- the primary responds with its last message (if it has one)

important detail: a secondary exchange must not overwrite the primary.
that’s why `ExchangeChannel.submit()` refuses to broadcast from a secondary exchange until it has been initialized by the primary.
- each consumer of the exchange's data creates a channel on an exchange. it receives updates using a callback from the channel.
- whenever an end user of the api pushes data to a channel, the data is sent to the exchange. the exchange pushes the data to its connected channels and portals. exchanges on the other side of portals consume the update and distribute it further to their channels and portals, and so on
- updates flow through this acyclic network throughout the extension, keeping every consumer up to date
- exchanges, channels and portals can be dynamically created and destroyed whenever
- the system tracks created and destroyed objects to avoid memory leaks

note: `Exchange.createChannel()` logs creation with a `console.warn` right now. this is mainly for leak hunting.

implementation example:

- in src/extension/projects/project.ts, each project instance has a builtin 'event system' that allows it to track changes to the underlying config. for efficiency reasons, it also tracks roughly which part of the config has changed
- the project instance creates (or is given) a channel from an exchange to use for synchronization purposes.
- whenever a project instance detects a change to its config (using the internal event system), it submits an update to its channel, and its exchange pushes the update further
- portals serialize the project instance into JSON and push it through to the exchange on the other side
- the deserialization function takes the project JSON, creates a new instance and attaches a new channel (from its own exchange) to the project instance
- other project instances connected to the exchange will receive the new project instance. they then use it to update their own configs. no internal events are fired for these updates (to avoid infinite loops)
