# DevTools minor release: npm/Chrome 3.2.0 and Flutter 3.1.0

## Scope and readiness

- The v3-devtools-parity phase has nine completed and archived implementation changes.
- All twelve fixed-version npm packages advance from 3.1.0 to 3.2.0.
- Chrome DevTools advances to 3.2.0 and is distributed as a downloadable Manifest V3 ZIP, not a Chrome Web Store listing.
- entity_graph_flutter and its bundled official DevTools companion advance from 3.0.5 to 3.1.0; Dart runtime behavior is unchanged.
- npm 3.2.0 includes the post-publication core event-byte-boundary fix and React inspector search scheduling fix.
- No sovereign-sync implementation or dependency upgrade is included.

## Publication gate

Candidate `d7dff293a79d9d3cba26fa3a0c0fbb47e8d07944` passed the packed core/React/browser and Flutter/Riverpod/VM-service acceptance gates, official extension validation, twelve-package consumer verification, a zero-warning Flutter dry run, both documentation builds, and independent review with no critical findings. See `devtools-3.2.0-certification.json` and the review disposition. Registry mutation follows certification; publication receipts and documentation are refreshed afterward.

## Explicit exclusions

Human usability certification, physical-device/app-store certification, verified pub.dev publisher assignment, and Chrome Web Store submission are not claimed by this release.
