# React inspector security boundary

Date: 2026-08-30

- The embedded same-origin inspector may join entity values directly from the
  selected local `GraphStore`; it does not acquire commit authority.
- Browser, extension, VM-service, download, clipboard, and other serialized
  transports are metadata-only unless the host explicitly enables values and
  supplies the redaction policy.
- Browser persistence stores only versioned DevTools preferences and accepted
  enum values. Entity values, secrets, history payloads, and graph state are
  not persisted there.
- Production Vite and Next bundles exclude the debug host and inspector. The
  side-effectful `./devtools/auto` entry is an explicit development opt-in;
  the ordinary root and `./devtools` entry remain side-effect-free.
- The packed acceptance fixtures use synthetic entity data and retain no
  credential or secret value in screenshots, JSON receipts, or traces.

This is the actual value-serialization and debug-code trust boundary. No
additional security guard was added outside it.

