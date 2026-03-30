/**
 * table/presets/supabase-adapter.ts
 *
 * Supabase Realtime adapter for preset persistence.
 * Subscribes to a `table_presets` table for live changes.
 *
 * Uses type-only imports; the Supabase client is a peer dependency.
 */
import type { TableStorageAdapter } from "./storage";
import type {
  FilterPreset,
  ColumnPreset,
  ActivePresets,
  PresetChangeEvent,
  UnsubscribeFn,
} from "./types";

interface SupabaseClient {
  from: (table: string) => {
    select: (columns?: string) => {
      eq: (col: string, val: string) => {
        eq: (col: string, val: string) => Promise<{ data: unknown[] | null; error: unknown }>;
        single: () => Promise<{ data: unknown | null; error: unknown }>;
      } & Promise<{ data: unknown[] | null; error: unknown }>;
    };
    upsert: (data: unknown) => Promise<{ error: unknown }>;
    delete: () => {
      eq: (col: string, val: string) => {
        eq: (col: string, val: string) => Promise<{ error: unknown }>;
      };
    };
  };
  channel: (name: string) => {
    on: (
      event: string,
      config: Record<string, unknown>,
      callback: (payload: Record<string, unknown>) => void,
    ) => { subscribe: () => { unsubscribe: () => void } };
  };
}

export interface SupabaseAdapterOptions {
  supabaseClient: SupabaseClient;
  tableName?: string;
  userId?: string;
}

export class SupabaseRealtimeAdapter implements TableStorageAdapter {
  private client: SupabaseClient;
  private tableName: string;
  private userId: string;

  constructor(options: SupabaseAdapterOptions) {
    this.client = options.supabaseClient;
    this.tableName = options.tableName ?? "table_presets";
    this.userId = options.userId ?? "anonymous";
  }

  async loadFilterPresets(tableId: string): Promise<FilterPreset[]> {
    const { data } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("table_id", tableId)
      .eq("preset_type", "filter");
    if (!data) return [];
    return (data as Record<string, unknown>[]).map((row) =>
      JSON.parse(row.preset_data as string) as FilterPreset,
    );
  }

  async saveFilterPreset(tableId: string, preset: FilterPreset): Promise<void> {
    await this.client.from(this.tableName).upsert({
      id: `${tableId}:filter:${preset.id}`,
      table_id: tableId,
      preset_type: "filter",
      preset_id: preset.id,
      preset_data: JSON.stringify(preset),
      user_id: this.userId,
      updated_at: new Date().toISOString(),
    });
  }

  async deleteFilterPreset(tableId: string, presetId: string): Promise<void> {
    await this.client
      .from(this.tableName)
      .delete()
      .eq("table_id", tableId)
      .eq("preset_id", presetId);
  }

  async loadColumnPresets(tableId: string): Promise<ColumnPreset[]> {
    const { data } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("table_id", tableId)
      .eq("preset_type", "column");
    if (!data) return [];
    return (data as Record<string, unknown>[]).map((row) =>
      JSON.parse(row.preset_data as string) as ColumnPreset,
    );
  }

  async saveColumnPreset(tableId: string, preset: ColumnPreset): Promise<void> {
    await this.client.from(this.tableName).upsert({
      id: `${tableId}:column:${preset.id}`,
      table_id: tableId,
      preset_type: "column",
      preset_id: preset.id,
      preset_data: JSON.stringify(preset),
      user_id: this.userId,
      updated_at: new Date().toISOString(),
    });
  }

  async deleteColumnPreset(tableId: string, presetId: string): Promise<void> {
    await this.client
      .from(this.tableName)
      .delete()
      .eq("table_id", tableId)
      .eq("preset_id", presetId);
  }

  async loadActivePresets(tableId: string): Promise<ActivePresets> {
    const result = await this.client
      .from(this.tableName)
      .select("preset_data")
      .eq("table_id", tableId)
      .eq("preset_type", "active");
    const data = result.data;
    if (!data || data.length === 0) return {};
    return JSON.parse((data[0] as Record<string, string>).preset_data) as ActivePresets;
  }

  async saveActivePresets(tableId: string, active: ActivePresets): Promise<void> {
    await this.client.from(this.tableName).upsert({
      id: `${tableId}:active`,
      table_id: tableId,
      preset_type: "active",
      preset_id: "active",
      preset_data: JSON.stringify(active),
      user_id: this.userId,
      updated_at: new Date().toISOString(),
    });
  }

  subscribe(
    tableId: string,
    callback: (event: PresetChangeEvent) => void,
  ): UnsubscribeFn {
    const subscription = this.client
      .channel(`table-presets:${tableId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: this.tableName,
          filter: `table_id=eq.${tableId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old ?? {}) as Record<string, string>;
          const presetType = row.preset_type as "filter" | "column";
          if (presetType !== "filter" && presetType !== "column") return;

          const eventType = payload.eventType as string;
          let operation: PresetChangeEvent["operation"] = "updated";
          if (eventType === "INSERT") operation = "created";
          else if (eventType === "DELETE") operation = "deleted";

          let preset: FilterPreset | ColumnPreset | undefined;
          try {
            if (row.preset_data) {
              preset = JSON.parse(row.preset_data);
            }
          } catch {
            // ignore parse errors
          }

          callback({
            tableId,
            presetType,
            presetId: row.preset_id ?? "",
            operation,
            preset,
            source: "remote",
            timestamp: Date.now(),
          });
        },
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }
}
