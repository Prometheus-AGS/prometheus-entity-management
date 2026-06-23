# @prometheus-ags/entity-graph-web-components

Lit 3 custom elements — `<entity-list>`, `<entity-detail>`, `<entity-form>` — built on
[`@prometheus-ags/entity-graph-core`](../entity-graph-core). Framework-agnostic; works
anywhere you can include a `<script type="module">`.

## Architecture

```
Custom element
  └── EntityListController / EntityDetailController / EntityFormController
        └── useGraphStore (entity-graph-core, Zustand)
              └── fetchEntity / fetchList / engine (entity-graph-core)
```

The controllers implement Lit 3's `ReactiveController` interface, subscribing to the
core Zustand graph store and calling `requestUpdate()` on the host element when relevant
slices change. No graph logic is reimplemented here — all fetch / retry / dedup / GC
logic lives in `entity-graph-core`.

## Installation

```bash
pnpm add @prometheus-ags/entity-graph-web-components lit @prometheus-ags/entity-graph-core
```

## Custom Elements

### `<entity-list>`

```html
<entity-list entity-type="Invoice" id="invoice-list"></entity-list>

<script type="module">
  import "@prometheus-ags/entity-graph-web-components";
  import { registerEntityTransport, makeRestTransport } from "@prometheus-ags/entity-graph-core";

  registerEntityTransport("Invoice", makeRestTransport({ baseUrl: "/api/invoices" }));

  const el = document.querySelector("#invoice-list");
  el.configure({
    queryKey: ["invoices"],
    fetch: (params) => fetch("/api/invoices").then(r => r.json()),
    normalize: (raw) => ({ id: raw.id, data: raw }),
  });

  el.addEventListener("entity-list-loaded", (e) => {
    console.log("Loaded", e.detail.items.length, "invoices");
  });
</script>
```

**Attributes**: `entity-type` (required), `loading-text`, `empty-text`

**Events**: `entity-list-loaded`, `entity-list-error`

**Slots**: default (item markup), `loading`, `empty`, `load-more`, `error`

---

### `<entity-detail>`

```html
<entity-detail entity-type="Invoice" entity-id="inv-123" id="detail">
  <!-- Projected markup is shown once entity is available -->
  <p id="title"></p>
</entity-detail>

<script type="module">
  import "@prometheus-ags/entity-graph-web-components";

  const el = document.querySelector("#detail");
  el.configure({
    fetch: (id) => fetch(`/api/invoices/${id}`).then(r => r.json()),
    normalize: (raw) => raw,
  });

  el.addEventListener("entity-loaded", (e) => {
    document.querySelector("#title").textContent = e.detail.entity.title;
  });
</script>
```

**Attributes**: `entity-type`, `entity-id`, `loading-text`, `not-found-text`

**Events**: `entity-loaded`, `entity-not-found`, `entity-error`

---

### `<entity-form>`

```html
<entity-form entity-type="Invoice" entity-id="inv-123" id="inv-form">
  <input id="title-input" name="title" />
  <div slot="actions">
    <button id="save-btn">Save</button>
    <button id="delete-btn">Delete</button>
  </div>
</entity-form>

<script type="module">
  import "@prometheus-ags/entity-graph-web-components";
  import { useGraphStore } from "@prometheus-ags/entity-graph-core";

  const el = document.querySelector("#inv-form");

  el.configure({
    fetch: (id) => fetch(`/api/invoices/${id}`).then(r => r.json()),
    normalize: (raw) => raw,
    onSave: async (buf) => {
      const saved = await fetch(`/api/invoices/${buf.id}`, {
        method: "PUT",
        body: JSON.stringify(buf),
        headers: { "Content-Type": "application/json" },
      }).then(r => r.json());
      useGraphStore.getState().upsertEntity("Invoice", saved.id, saved);
    },
    onDelete: async (id) => {
      await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      useGraphStore.getState().removeEntity("Invoice", id);
      useGraphStore.getState().removeIdFromAllLists("Invoice", id);
    },
  });

  document.querySelector("#title-input").addEventListener("input", (e) => {
    el.setField("title", e.target.value);
  });

  document.querySelector("#save-btn").addEventListener("click", () => el.save());
  document.querySelector("#delete-btn").addEventListener("click", () => el.deleteEntity());

  el.addEventListener("entity-form-saved", () => console.log("Saved!"));
  el.addEventListener("entity-form-error", (e) => console.error(e.detail.message));
</script>
```

**Attributes**: `entity-type`, `entity-id`, `loading-text`, `saving-text`

**Events**: `entity-form-saved`, `entity-form-deleted`, `entity-form-error`, `entity-form-dirty`

**Slots**: default (form fields), `loading`, `actions`, `error`

---

## Lit Elements (using controllers in your own elements)

```ts
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { EntityListController } from "@prometheus-ags/entity-graph-web-components";

@customElement("my-invoice-list")
class MyInvoiceList extends LitElement {
  readonly #list = new EntityListController<RawInvoice, Invoice>(this, "Invoice", {
    queryKey: ["invoices", { status: "open" }],
    fetch: (params) => api.listInvoices(params),
    normalize: (raw) => ({ id: raw.id, data: raw }),
  });

  render() {
    const { items, isLoading, hasNextPage } = this.#list;

    if (isLoading && items.length === 0) return html`<p>Loading…</p>`;

    return html`
      <ul>
        ${items.map((inv) => html`<li>${inv.title} — $${inv.amount}</li>`)}
      </ul>
      ${hasNextPage
        ? html`<button @click=${() => this.#list.loadMore()}>Load more</button>`
        : ""}
    `;
  }
}
```

## Running Tests

```bash
pnpm --filter @prometheus-ags/entity-graph-web-components test
```

## Building

```bash
pnpm --filter @prometheus-ags/entity-graph-web-components build
```
