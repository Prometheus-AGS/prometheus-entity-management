/**
 * Neutral hydration payload types shared by the RSC server layer and the
 * client hydration boundary. This module must stay dependency-free so both
 * server and client modules can import it without crossing the boundary.
 */

export interface InitialEntity {
  type: string;
  id: string;
  data: Record<string, unknown>;
}

export interface InitialList {
  /** Serialized list query key — must match `serializeKey(queryKey)` used by the hooks. */
  key: string;
  ids: string[];
  total: number | null;
}

export interface HydrationPayload {
  entities: InitialEntity[];
  lists: InitialList[];
}
