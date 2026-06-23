/**
 * table/presets/rest-adapter.ts
 *
 * REST API storage adapter with optional polling or SSE for realtime updates.
 * Requires a REST endpoint that stores presets per table ID.
 */
import type { TableStorageAdapter } from "./storage";
import type {
  FilterPreset,
  ColumnPreset,
  ActivePresets,
  PresetChangeEvent,
  UnsubscribeFn,
} from "./types";

export interface RestAdapterOptions {
  baseUrl: string;
  headers?: Record<string, string> | (() => Record<string, string>);
  pollInterval?: number;
  sseEndpoint?: string;
}

export class RestApiAdapter implements TableStorageAdapter {
  private baseUrl: string;
  private headers: Record<string, string> | (() => Record<string, string>);
  private pollInterval?: number;
  private sseEndpoint?: string;

  constructor(options: RestAdapterOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.headers = options.headers ?? {};
    this.pollInterval = options.pollInterval;
    this.sseEndpoint = options.sseEndpoint;
  }

  private getHeaders(): Record<string, string> {
    const h = typeof this.headers === "function" ? this.headers() : this.headers;
    return { "Content-Type": "application/json", ...h };
  }

  async loadFilterPresets(tableId: string): Promise<FilterPreset[]> {
    const res = await fetch(
      `${this.baseUrl}/tables/${encodeURIComponent(tableId)}/filter-presets`,
      { headers: this.getHeaders() },
    );
    if (!res.ok) return [];
    return res.json();
  }

  async saveFilterPreset(tableId: string, preset: FilterPreset): Promise<void> {
    await fetch(
      `${this.baseUrl}/tables/${encodeURIComponent(tableId)}/filter-presets/${encodeURIComponent(preset.id)}`,
      {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify(preset),
      },
    );
  }

  async deleteFilterPreset(tableId: string, presetId: string): Promise<void> {
    await fetch(
      `${this.baseUrl}/tables/${encodeURIComponent(tableId)}/filter-presets/${encodeURIComponent(presetId)}`,
      { method: "DELETE", headers: this.getHeaders() },
    );
  }

  async loadColumnPresets(tableId: string): Promise<ColumnPreset[]> {
    const res = await fetch(
      `${this.baseUrl}/tables/${encodeURIComponent(tableId)}/column-presets`,
      { headers: this.getHeaders() },
    );
    if (!res.ok) return [];
    return res.json();
  }

  async saveColumnPreset(tableId: string, preset: ColumnPreset): Promise<void> {
    await fetch(
      `${this.baseUrl}/tables/${encodeURIComponent(tableId)}/column-presets/${encodeURIComponent(preset.id)}`,
      {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify(preset),
      },
    );
  }

  async deleteColumnPreset(tableId: string, presetId: string): Promise<void> {
    await fetch(
      `${this.baseUrl}/tables/${encodeURIComponent(tableId)}/column-presets/${encodeURIComponent(presetId)}`,
      { method: "DELETE", headers: this.getHeaders() },
    );
  }

  async loadActivePresets(tableId: string): Promise<ActivePresets> {
    const res = await fetch(
      `${this.baseUrl}/tables/${encodeURIComponent(tableId)}/active`,
      { headers: this.getHeaders() },
    );
    if (!res.ok) return {};
    return res.json();
  }

  async saveActivePresets(tableId: string, active: ActivePresets): Promise<void> {
    await fetch(
      `${this.baseUrl}/tables/${encodeURIComponent(tableId)}/active`,
      {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify(active),
      },
    );
  }

  subscribe(
    tableId: string,
    callback: (event: PresetChangeEvent) => void,
  ): UnsubscribeFn {
    if (this.sseEndpoint) {
      return this.subscribeSSE(tableId, callback);
    }
    if (this.pollInterval) {
      return this.subscribePoll(tableId, callback);
    }
    return () => {};
  }

  private subscribeSSE(
    tableId: string,
    callback: (event: PresetChangeEvent) => void,
  ): UnsubscribeFn {
    const url = `${this.sseEndpoint}?tableId=${encodeURIComponent(tableId)}`;
    const source = new EventSource(url);

    source.addEventListener("preset-change", (e) => {
      try {
        const event = JSON.parse(e.data) as PresetChangeEvent;
        callback(event);
      } catch {
        // ignore malformed SSE data
      }
    });

    return () => source.close();
  }

  private subscribePoll(
    tableId: string,
    callback: (event: PresetChangeEvent) => void,
  ): UnsubscribeFn {
    let lastFilterHash = "";
    let lastColumnHash = "";

    const check = async () => {
      const [filters, columns] = await Promise.all([
        this.loadFilterPresets(tableId),
        this.loadColumnPresets(tableId),
      ]);

      const filterHash = JSON.stringify(filters);
      const columnHash = JSON.stringify(columns);

      if (filterHash !== lastFilterHash && lastFilterHash !== "") {
        callback({
          tableId,
          presetType: "filter",
          presetId: "",
          operation: "updated",
          source: "remote",
          timestamp: Date.now(),
        });
      }
      if (columnHash !== lastColumnHash && lastColumnHash !== "") {
        callback({
          tableId,
          presetType: "column",
          presetId: "",
          operation: "updated",
          source: "remote",
          timestamp: Date.now(),
        });
      }

      lastFilterHash = filterHash;
      lastColumnHash = columnHash;
    };

    void check();
    const interval = setInterval(check, this.pollInterval!);
    return () => clearInterval(interval);
  }
}
