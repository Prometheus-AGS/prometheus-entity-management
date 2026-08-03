(() => {
  // node_modules/.pnpm/@tauri-apps+api@2.11.1/node_modules/@tauri-apps/api/external/tslib/tslib.es6.js
  function __classPrivateFieldGet(receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
  }
  function __classPrivateFieldSet(receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
  }

  // node_modules/.pnpm/@tauri-apps+api@2.11.1/node_modules/@tauri-apps/api/core.js
  var _Channel_onmessage;
  var _Channel_nextMessageIndex;
  var _Channel_pendingMessages;
  var _Channel_messageEndIndex;
  var _Resource_rid;
  var SERIALIZE_TO_IPC_FN = "__TAURI_TO_IPC_KEY__";
  function transformCallback(callback, once2 = false) {
    return window.__TAURI_INTERNALS__.transformCallback(callback, once2);
  }
  var Channel = class {
    constructor(onmessage) {
      _Channel_onmessage.set(this, void 0);
      _Channel_nextMessageIndex.set(this, 0);
      _Channel_pendingMessages.set(this, []);
      _Channel_messageEndIndex.set(this, void 0);
      __classPrivateFieldSet(this, _Channel_onmessage, onmessage || (() => {
      }), "f");
      this.id = transformCallback((rawMessage) => {
        const index = rawMessage.index;
        if ("end" in rawMessage) {
          if (index == __classPrivateFieldGet(this, _Channel_nextMessageIndex, "f")) {
            this.cleanupCallback();
          } else {
            __classPrivateFieldSet(this, _Channel_messageEndIndex, index, "f");
          }
          return;
        }
        const message = rawMessage.message;
        if (index == __classPrivateFieldGet(this, _Channel_nextMessageIndex, "f")) {
          __classPrivateFieldGet(this, _Channel_onmessage, "f").call(this, message);
          __classPrivateFieldSet(this, _Channel_nextMessageIndex, __classPrivateFieldGet(this, _Channel_nextMessageIndex, "f") + 1, "f");
          while (__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f") in __classPrivateFieldGet(this, _Channel_pendingMessages, "f")) {
            const message2 = __classPrivateFieldGet(this, _Channel_pendingMessages, "f")[__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f")];
            __classPrivateFieldGet(this, _Channel_onmessage, "f").call(this, message2);
            delete __classPrivateFieldGet(this, _Channel_pendingMessages, "f")[__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f")];
            __classPrivateFieldSet(this, _Channel_nextMessageIndex, __classPrivateFieldGet(this, _Channel_nextMessageIndex, "f") + 1, "f");
          }
          if (__classPrivateFieldGet(this, _Channel_nextMessageIndex, "f") === __classPrivateFieldGet(this, _Channel_messageEndIndex, "f")) {
            this.cleanupCallback();
          }
        } else {
          __classPrivateFieldGet(this, _Channel_pendingMessages, "f")[index] = message;
        }
      });
    }
    cleanupCallback() {
      window.__TAURI_INTERNALS__.unregisterCallback(this.id);
    }
    set onmessage(handler) {
      __classPrivateFieldSet(this, _Channel_onmessage, handler, "f");
    }
    get onmessage() {
      return __classPrivateFieldGet(this, _Channel_onmessage, "f");
    }
    [(_Channel_onmessage = /* @__PURE__ */ new WeakMap(), _Channel_nextMessageIndex = /* @__PURE__ */ new WeakMap(), _Channel_pendingMessages = /* @__PURE__ */ new WeakMap(), _Channel_messageEndIndex = /* @__PURE__ */ new WeakMap(), SERIALIZE_TO_IPC_FN)]() {
      return `__CHANNEL__:${this.id}`;
    }
    toJSON() {
      return this[SERIALIZE_TO_IPC_FN]();
    }
  };
  async function invoke(cmd, args = {}, options) {
    return window.__TAURI_INTERNALS__.invoke(cmd, args, options);
  }
  _Resource_rid = /* @__PURE__ */ new WeakMap();

  // node_modules/.pnpm/@tauri-apps+api@2.11.1/node_modules/@tauri-apps/api/event.js
  var TauriEvent;
  (function(TauriEvent2) {
    TauriEvent2["WINDOW_RESIZED"] = "tauri://resize";
    TauriEvent2["WINDOW_MOVED"] = "tauri://move";
    TauriEvent2["WINDOW_CLOSE_REQUESTED"] = "tauri://close-requested";
    TauriEvent2["WINDOW_DESTROYED"] = "tauri://destroyed";
    TauriEvent2["WINDOW_FOCUS"] = "tauri://focus";
    TauriEvent2["WINDOW_BLUR"] = "tauri://blur";
    TauriEvent2["WINDOW_SCALE_FACTOR_CHANGED"] = "tauri://scale-change";
    TauriEvent2["WINDOW_THEME_CHANGED"] = "tauri://theme-changed";
    TauriEvent2["WINDOW_CREATED"] = "tauri://window-created";
    TauriEvent2["WINDOW_SUSPENDED"] = "tauri://suspended";
    TauriEvent2["WINDOW_RESUMED"] = "tauri://resumed";
    TauriEvent2["WEBVIEW_CREATED"] = "tauri://webview-created";
    TauriEvent2["DRAG_ENTER"] = "tauri://drag-enter";
    TauriEvent2["DRAG_OVER"] = "tauri://drag-over";
    TauriEvent2["DRAG_DROP"] = "tauri://drag-drop";
    TauriEvent2["DRAG_LEAVE"] = "tauri://drag-leave";
  })(TauriEvent || (TauriEvent = {}));
  async function _unlisten(event, eventId) {
    window.__TAURI_EVENT_PLUGIN_INTERNALS__.unregisterListener(event, eventId);
    await invoke("plugin:event|unlisten", {
      event,
      eventId
    });
  }
  async function listen(event, handler, options) {
    var _a;
    const target = typeof (options === null || options === void 0 ? void 0 : options.target) === "string" ? { kind: "AnyLabel", label: options.target } : (_a = options === null || options === void 0 ? void 0 : options.target) !== null && _a !== void 0 ? _a : { kind: "Any" };
    return invoke("plugin:event|listen", {
      event,
      target,
      handler: transformCallback(handler)
    }).then((eventId) => {
      return async () => _unlisten(event, eventId);
    });
  }
  async function once(event, handler, options) {
    return listen(event, (eventData) => {
      void _unlisten(event, eventData.id);
      handler(eventData);
    }, options);
  }
  async function emit(event, payload) {
    await invoke("plugin:event|emit", {
      event,
      payload
    });
  }

  // packages/entity-graph-tauri/src/generated-bindings.ts
  var commands = {
    /**  Upsert an entity into the plugin's in-memory mirror. */
    graphUpsertEntity: (payload) => typedError(invoke("plugin:entity-graph-tauri|graph_upsert_entity", { payload })),
    /**  Remove an entity from the plugin's in-memory mirror. */
    graphRemoveEntity: (payload) => typedError(invoke("plugin:entity-graph-tauri|graph_remove_entity", { payload })),
    /**  Record a UI-only patch overlay (acknowledged but not mirrored on Rust side). */
    graphPatchEntity: (payload) => typedError(invoke("plugin:entity-graph-tauri|graph_patch_entity", { payload })),
    /**  Set the ordered ID array for a list query key. */
    graphSetList: (payload) => typedError(invoke("plugin:entity-graph-tauri|graph_set_list", { payload })),
    /**  Read a single entity from the in-memory mirror. */
    graphGetEntity: (entityType, entityId) => typedError(invoke("plugin:entity-graph-tauri|graph_get_entity", { entityType, entityId })),
    /**  Read a list from the in-memory mirror. */
    graphGetList: (queryKey) => typedError(invoke("plugin:entity-graph-tauri|graph_get_list", { queryKey })),
    /**  Invoke the registered desktop, Android, or iOS native bridge. */
    graphPlatformPing: () => typedError(invoke("plugin:entity-graph-tauri|graph_platform_ping")),
    /**  Clear all entities and lists from the in-memory mirror. */
    graphClear: () => typedError(invoke("plugin:entity-graph-tauri|graph_clear")),
    /**
     *  Persist a JSON-serialised graph snapshot to the in-memory store and emit
     *  a `SnapshotPersistedEvent`.
     */
    graphPersistSnapshot: (payload) => typedError(invoke("plugin:entity-graph-tauri|graph_persist_snapshot", { payload })),
    /**
     *  Return a previously persisted snapshot string and emit a
     *  `SnapshotRestoredEvent`.
     */
    graphRestoreSnapshot: (payload) => typedError(invoke("plugin:entity-graph-tauri|graph_restore_snapshot", { payload }))
  };
  var events = {
    entityChanged: makeEvent("plugin:entity-graph-tauri:entity-changed"),
    error: makeEvent("plugin:entity-graph-tauri:error"),
    snapshotPersisted: makeEvent("plugin:entity-graph-tauri:snapshot-persisted"),
    snapshotRestored: makeEvent("plugin:entity-graph-tauri:snapshot-restored")
  };
  async function typedError(result) {
    try {
      return { status: "ok", data: await result };
    } catch (e) {
      if (e instanceof Error) throw e;
      return { status: "error", error: e };
    }
  }
  function makeEvent(name, serialize, deserialize) {
    const mapEvent = (cb) => (event) => cb({ ...event, payload: deserialize ? deserialize(event.payload) : event.payload });
    const mapPayload = (payload) => serialize ? serialize(payload) : payload;
    const base = {
      listen: (cb) => listen(name, mapEvent(cb)),
      once: (cb) => once(name, mapEvent(cb)),
      emit: ((payload) => emit(name, mapPayload(payload)))
    };
    const fn = (target) => ({
      listen: (cb) => target.listen(name, mapEvent(cb)),
      once: (cb) => target.once(name, mapEvent(cb)),
      emit: ((payload) => target.emit(name, mapPayload(payload)))
    });
    return Object.assign(fn, base);
  }

  // tests/fixtures/tauri-plugin-host/frontend/main.ts
  var status = document.querySelector("[data-contract-status]");
  var response = document.querySelector("[data-contract-response]");
  function render(state, value) {
    if (!status || !response) throw new Error("contract screen is missing its status elements");
    status.dataset.state = state;
    status.textContent = state.toUpperCase();
    response.textContent = typeof value === "string" ? value : JSON.stringify(value);
    document.documentElement.dataset.contractState = state;
  }
  async function verifyNativeBridge() {
    render("checking", "Calling commands.graphPlatformPing() \u2026");
    try {
      const result = await commands.graphPlatformPing();
      if (result.status === "ok") {
        render("passed", result.data);
        return;
      }
      render("denied", String(result.error));
    } catch (error) {
      render("failed", error instanceof Error ? error.message : String(error));
    }
  }
  void verifyNativeBridge();
})();
