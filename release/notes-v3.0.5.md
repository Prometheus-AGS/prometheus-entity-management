# Prometheus Entity Management 3.0.5

This corrective release makes provider-scoped imperative graph access resolve
against the active graph store, fixing GitHub issue #42 without changing the
default singleton behavior for applications that do not use a scoped provider.

The React and Flutter documentation now records A2UI 1.0-RC compatibility and
AG-UI 0.0.59 transport support. Flutter remains independently published as
`entity_graph_flutter@3.0.5` on pub.dev, including the optional controller and
official Flutter DevTools companion.

All twelve `@prometheus-ags` npm packages are published at 3.0.5. Both `latest`
and `next` point to 3.0.5. Version 3.0.4 is deprecated because it was published
with stale build artifacts.

Published source: `0cbce288b5116bf2ab866a4d3e9c960bdf45fb67`.
