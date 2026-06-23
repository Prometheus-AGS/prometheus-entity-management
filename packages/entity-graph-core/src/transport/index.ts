/**
 * 2.0 transport layer — public re-exports for `src/index.ts`.
 */
export type {
  EntityTransport,
  ListQuery,
  ListResult,
  ChangeEvent,
  ChangeOp,
} from "./types";
export {
  registerEntityTransport,
  getEntityTransport,
  getRegisteredEntityTypes,
  __resetEntityTransports,
} from "./registry";
export {
  makeRestTransport,
  type MakeRestTransportOptions,
  type SupabaseLike,
  type SupabaseQueryBuilderLike,
} from "./rest";
