/**
 * Gate for the deprecated in-process devtools event stream
 * (`subscribeDevtoolsEvent`) fed by graph transactions.
 *
 * Where `process` exists (Node, SSR, tests, bundles that polyfill it) the rule
 * is unchanged: emit unless `NODE_ENV === "production"`. Where it does not (a
 * browser bundle), emit only under Vite's `import.meta.env.DEV === true`. Before
 * 4.4.0 the guard was `typeof process === "undefined" || ...`, which was true in
 * every browser bundle, so production pages emitted events.
 *
 * Precedence:
 * 1. Build-time flag `__PROMETHEUS_ENTITY_GRAPH_DEVTOOLS__` (bundler `define`).
 *    `false` removes the emission code from the bundle entirely (tree-shaken);
 *    `true` keeps it and turns emission on by default.
 * 2. Runtime override `setGraphDevtoolsEmission(true | false)`.
 * 3. Environment detection as described above.
 */

/** Inputs to the emission decision; exported for tests only. */
export interface DevtoolsEmissionEnvironment {
  buildFlag: boolean | undefined;
  override: boolean | undefined;
  /** `process.env` when a `process` global exists, else `undefined`. */
  processEnv: { NODE_ENV?: string } | undefined;
  viteDev: boolean | undefined;
}

/** @internal Pure emission decision, see the precedence above. */
export function resolveDevtoolsEmission(env: DevtoolsEmissionEnvironment): boolean {
  if (env.buildFlag !== undefined) return env.buildFlag && env.override !== false;
  if (env.override !== undefined) return env.override;
  if (env.processEnv !== undefined) return env.processEnv.NODE_ENV !== "production";
  return env.viteDev === true;
}

declare const __PROMETHEUS_ENTITY_GRAPH_DEVTOOLS__: boolean | undefined;
declare const process: { env?: { NODE_ENV?: string } } | undefined;

let override: boolean | undefined;

/**
 * Explicitly enable (`true`) or disable (`false`) devtools event emission at
 * runtime; `undefined` restores environment detection. Has no effect when the
 * build-time flag is `false`, because the code is no longer in the bundle.
 */
export function setGraphDevtoolsEmission(enabled: boolean | undefined): void {
  override = enabled;
}

/** True when graph transactions currently emit devtools events. */
export function isGraphDevtoolsEmissionEnabled(): boolean {
  return resolveDevtoolsEmission({
    buildFlag: typeof __PROMETHEUS_ENTITY_GRAPH_DEVTOOLS__ === "boolean" ? __PROMETHEUS_ENTITY_GRAPH_DEVTOOLS__ : undefined,
    override,
    processEnv: typeof process !== "undefined" ? process.env ?? {} : undefined,
    viteDev: (import.meta as ImportMeta & { readonly env?: { readonly DEV?: boolean } }).env?.DEV,
  });
}

/**
 * Emit a devtools event when the gate allows it. The event is built lazily, and
 * with the build-time flag set to `false` this function body is empty, so
 * minifiers drop the calls and their payload literals.
 */
export function emitGatedDevtoolsEvent<E>(emit: (event: E) => void, build: () => E): void {
  if (
    (typeof __PROMETHEUS_ENTITY_GRAPH_DEVTOOLS__ !== "boolean" || __PROMETHEUS_ENTITY_GRAPH_DEVTOOLS__) &&
    isGraphDevtoolsEmissionEnabled()
  ) {
    emit(build());
  }
}
