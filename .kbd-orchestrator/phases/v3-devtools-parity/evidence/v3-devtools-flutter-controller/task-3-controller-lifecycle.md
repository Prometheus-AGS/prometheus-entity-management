# Flutter controller task 3 — per-graph attachment lifecycle

Date: 2026-08-30

## Production implementation

`package:entity_graph_flutter/devtools.dart` now exports
`EntityGraphDevtoolsBinding` and `EntityGraphDevtoolsController`.

The binding owns the following lifecycle contract:

- a weak `Expando` slot provides one controller registry entry per
  `EntityGraph`, without a strong process-global graph map;
- every enabled attachment to the same live graph shares that controller and
  increments one reference;
- `enabled: false` returns an inert binding and does not create, reference, or
  tear down a controller;
- each binding's `detach` is idempotent and releases exactly one reference;
- only the final detach publishes `disposed`, clears tooling listeners, and
  removes the active slot entry;
- another graph receives a different controller and generated store identity;
- `controllerFor` observes an already-attached controller without extending its
  lifetime;
- a later reattachment after final disposal creates a fresh controller while
  retaining the graph's generated store identity.

The controller publishes stable, monotonically sequenced `attached` and
`disposed` protocol-v1 lifecycle records. Callers can replay those records or
subscribe live. Listener exceptions are isolated at the actual development-
tooling boundary so inspector code cannot interrupt the production graph.
Lifecycle records contain only controller metadata and no entity values.

## Layering and policy

The controller remains available only through the optional DevTools library;
`entity_graph_flutter.dart` does not export or import it. Each controller owns
the host-provided value policy established by its first live attachment. Later
projection, history, and VM-service tasks must use that same policy and cannot
elevate it at a transport boundary.

## Verification level

`dart format` parsed the controller, optional entry, and v1 protocol files. A
static contract probe confirmed the weak per-graph slot, reference increment,
final-reference disposal, disabled and idempotent paths, controller lookup,
both lifecycle events, tooling listener isolation, optional export, and
ordinary-root exclusion. `git diff --check` passed.

No analyzer, compiler, test, or build ran. Runtime graph instrumentation,
projection/history behavior, VM-service transport, and the full assembled
integration gate remain tasks 4–8.
