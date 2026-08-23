---
title: Testing and troubleshooting
sidebar_position: 4
---

# Test the narrowest truthful boundary

During implementation, run the touched TypeScript check and targeted unit.
At a completed documentation phase, run content/schema checks, snippet
compilation, generated parity, a full Docusaurus build, link/search/sitemap
validation, and representative desktop/mobile routes. Browser visual,
Lighthouse, device, and deployed-route suites are delivery gates.

## Common failures

### A list does not update after an entity mutation

Confirm that the list stores the entity ID and the view resolves rows through
the same graph. Look for copied response objects or a binding that resolved a
second core version.

### A hook loops or refetches continuously

Check stable option/callback identities, the list's `lastFetched` and `stale`
state, subscriber registration, and whether a terminal service error was
recorded. Do not add retries without naming the observed failure scenario.

### Next.js users see each other's state

Remove the mutable server singleton. Create a graph per request, serialize its
state, and hydrate a scoped client provider. Realtime begins on the client.

### Realtime reconnect duplicates or loses state

Inspect tenant/channel/consumer identity, the last acknowledged checkpoint,
offset resume, snapshot recovery, and echo suppression. A green loopback test
does not prove live credentials or hosted infrastructure.

### npm staging returns E401/E403

Run `npm login --auth-type=web`, confirm the account has write access and 2FA,
then run `pnpm run release:npm-trust:verify`. The exact trust must name
`Prometheus-AGS/prometheus-entity-management`, `publish.yml`, `npm-rc`, and only
stage-publish permission. Do not add a long-lived token to make OIDC pass.

### GitHub Pages loads the homepage but deep routes fail

Verify `baseUrl`, explicit trailing slashes, `.nojekyll`, and that every route
probe uses `/prometheus-entity-management/`. Search assets and evidence URLs
must also resolve below the repository base path.
