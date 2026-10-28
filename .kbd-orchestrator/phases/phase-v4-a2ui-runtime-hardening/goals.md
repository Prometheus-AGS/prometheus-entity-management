# Goals

- #74 Release and bridge-document drift: tag v4.2.0 at 34a21156 (published tarball verified to contain application-supplied components), correct npm-registry-status, a2ui-protocol-bridge pins, CHANGELOG heading and candidateSourceSha
- #70 AG-UI redelivery is idempotent: duplicate or out-of-order activities never roll back a held surface or lose typed input
- #71 Versioned incremental activities: ACTIVITY_DELTA, surface versions, held-version reporting, client error and resync
- #72 Globally unique A2UI action ids and the upstream forwardedProps.a2uiAction.userAction envelope
- #73 Headless A2UI runtime entry and lossless exportSurfaceMessages with orphan pruning
