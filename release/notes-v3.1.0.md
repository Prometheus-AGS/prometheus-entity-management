# Prometheus Entity Management 3.1.0

This release adds the optional React entity-graph DevTools inspector, including
the development-only `./devtools/auto` bootstrap. The inspector exposes graph
causality, live/original/patch entity state, dirty state, rendered-view
membership, entity history, and controller-owned time travel while keeping the
ordinary package root inspector-free.

All twelve `@prometheus-ags` npm packages are published at 3.1.0. Both `latest`
and `next` point to 3.1.0. React continues to support A2UI 1.0-RC compatibility
and AG-UI 0.0.59 transport through `@prometheus-ags/a2ui-react`. Flutter remains
independently published as `entity_graph_flutter@3.0.1` on pub.dev.

The automated package gate passed for all twelve packed tarballs across Node
ESM, Node CommonJS, TypeScript NodeNext, TypeScript Node16, and bundler
consumers. Human usability certification for the DevTools UI remains pending;
this release does not claim that separate study has completed.

Published source: `2e3d57f18cd8fc6921b4f8b7e0b82c16311d1e8c`.
