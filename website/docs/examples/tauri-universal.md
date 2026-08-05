---
title: Tauri universal tutorial
sidebar_position: 5
---

# One Tauri application across desktop and mobile

The shared React/Vite frontend owns presentation and one normalized graph.
Native adapters provide persistence, commands, lifecycle, and deep-link input;
capability files grant the minimum platform surface. Offline intent is durable
and reconnect drains it without forking application logic per platform.

```bash
pnpm run typecheck:tauri-universal
pnpm run test:tauri-universal:unit
pnpm run test:tauri-universal:rust
pnpm run verify:tauri-universal
```

Current receipts cover Chromium layouts, packaged macOS, Android API 36
emulator, and iOS simulator. Windows/Linux, physical devices, signing,
notarization, and stores remain outside that claim.
