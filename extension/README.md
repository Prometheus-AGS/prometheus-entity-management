# Prometheus Entity Graph Chrome DevTools

This private Manifest V3 workspace packages the same inspector exported by
`@prometheus-ags/prometheus-entity-management/devtools` as a Chrome DevTools
panel. It is intended for local development and is not submitted to the Chrome
Web Store by this phase.

## Build and install

Download the [3.2.0 release ZIP](https://github.com/Prometheus-AGS/prometheus-entity-management/releases/download/v3.2.0/prometheus-entity-graph-devtools-3.2.0.zip),
extract it, and use **Load unpacked** on the extracted directory in
`chrome://extensions`. This is a developer-mode distribution, not a Chrome
Web Store listing. To build from source instead:

```bash
pnpm --filter @prometheus-ags/entity-graph-core build
pnpm --filter @prometheus-ags/prometheus-entity-management build
pnpm --filter @prometheus-ags/entity-graph-chrome-devtools package
```

Open `chrome://extensions`, enable developer mode, choose **Load unpacked**,
and select `extension/dist`. Open DevTools on an HTTP(S) application that
renders `<EntityGraphDevtools />`, then select the **Entity Graph** panel.

The explicit React DevTools host enables its bounded window bridge by default.
Set `enableWindowBridge={false}` when the embedded inspector should remain
local-only.

## Security model

- The manifest declares no `permissions` or `host_permissions` key. Its
  declarative isolated-world content script is nevertheless installed on all
  HTTP(S) pages so the panel can discover an opted-in graph.
- The page accepts same-window, same-origin, protocol-v1 bridge messages bound
  to the current content-document epoch. This page-visible channel is not an
  authentication boundary: scripts already executing in the inspected page
  share that page's trust domain and can observe or imitate its messages.
- Requests are capped at 512 KiB and responses at 8 MiB.
- Values remain metadata-only unless the application host explicitly configures
  the React controller with an include/redaction policy.
- The bridge exposes only the typed entity-graph DevTools command allowlist. It
  performs no arbitrary evaluation, network request, or unrestricted page action.
- The service worker routes by inspected tab and supports multiple panels without
  sharing events or command responses across tabs.

## Troubleshooting

- **No enabled graph found:** render `<EntityGraphDevtools />` in development,
  confirm `enableWindowBridge` is not false, then reload the inspected page.
- **Connecting after navigation:** the content script creates a new document
  epoch; the panel reconnects automatically after the new document mounts.
- **Values are hidden:** metadata-only is the default. Configure host-owned
  redaction before enabling values; the extension cannot weaken that policy.
- **Panel reconnects repeatedly:** close and reopen DevTools after reloading the
  unpacked extension so Chrome replaces the old service worker.
