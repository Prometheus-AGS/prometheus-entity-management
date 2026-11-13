## ADDED Requirements

### Requirement: Chat components consume AG-UI 1.0 events

`useChatSession`, `EntityChat`, `EntityCopilot` and `EntityStream` SHALL consume AG-UI 1.0 events, including the run lifecycle (`RUN_STARTED`, `RUN_FINISHED`, `RUN_ERROR`), text messages, tool calls and results, reasoning, state and `MESSAGES_SNAPSHOT`.

#### Scenario: AG-UI run renders

- **WHEN** a real AG-UI 1.0 stream runs a turn with text, a tool call and its result
- **THEN** the chat renders each in order and the run ends on `RUN_FINISHED`

### Requirement: Cancellation stops superseded runs

`streamFactory` SHALL receive an `AbortSignal`. A new send, a clear, or unmount SHALL abort the previous run, and events that arrive after abort SHALL cause no message or graph writes.

#### Scenario: Second send supersedes the first

- **WHEN** a second message is sent while the first run is streaming
- **THEN** the first run's signal is aborted and its later events write nothing

### Requirement: Chat messages live in the entity graph

Chat messages SHALL be written to the entity graph through a store, and hooks SHALL read them from the graph, so every view of a conversation shows the same messages.

#### Scenario: Two views of one conversation

- **WHEN** two components read the same conversation
- **THEN** both show the same messages as they stream
