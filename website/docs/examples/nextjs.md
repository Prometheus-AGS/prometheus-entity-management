---
title: Next.js App Router tutorial
sidebar_position: 3
---

# Next.js: request isolation through realtime takeover

1. Create a vanilla graph for each server request.
2. Populate it in a service and serialize only JSON-safe state to the RSC tree.
3. Hydrate a scoped React graph provider on the client.
4. Execute validated mutations through Server Actions or adapters.
5. Start realtime only after client hydration.

The packed-consumer gate installs core and React tarballs into an external app,
proves concurrent request isolation, performs a production build, and exercises
browser, keyboard, accessibility, screenshot, and trace scenarios.

```bash
pnpm run test:nextjs-app-router:unit
pnpm run verify:nextjs-app-router
```
