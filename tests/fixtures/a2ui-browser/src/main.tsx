import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import axe from "axe-core";
import { createGraphStore } from "../../../../packages/entity-graph-core/dist/index.mjs";
import {
  ENTITY_GRAPH_A2UI_ACTIONS,
  PROMETHEUS_A2UI_CATALOG_ID,
  PROMETHEUS_A2UI_PROTOCOL_VERSION,
  PrometheusA2uiProvider,
  PrometheusA2uiSurface,
  createEntityGraphA2uiActionPolicy,
  createPrometheusA2uiRuntime,
} from "../../../../packages/a2ui-react/dist/index.mjs";
import "./styles.css";

type Outcome = "executed" | "unauthorized-field" | "approval-denied";

interface BrowserState {
  ready: boolean;
  outcomes: Outcome[];
  axe: {
    critical: number;
    serious: number;
    incompleteCriticalOrSerious: number;
    violations: Array<{ id: string; impact: string | null; description: string }>;
    incomplete: Array<{
      id: string;
      impact: string | null;
      description: string;
      targets: string[];
    }>;
  } | null;
}

declare global {
  interface Window {
    __A2UI_TEST_STATE__: BrowserState;
  }
}

window.__A2UI_TEST_STATE__ = { ready: false, outcomes: [], axe: null };

const graph = createGraphStore();

function classifyDecision(decision: {
  status: string;
  code?: string;
  reason?: string;
}): Outcome | null {
  if (decision.status === "executed") return "executed";
  if (decision.code === "approval-denied") return "approval-denied";
  if (decision.code === "unauthorized" && decision.reason?.includes("Field")) {
    return "unauthorized-field";
  }
  return null;
}

function App() {
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [graphStatus, setGraphStatus] = useState("No agent mutation accepted yet");

  const runtime = useMemo(() => {
    const policy = createEntityGraphA2uiActionPolicy({
      graphStore: graph,
      entities: {
        Order: {
          actions: [
            ENTITY_GRAPH_A2UI_ACTIONS.upsert,
            ENTITY_GRAPH_A2UI_ACTIONS.remove,
          ],
          fields: ["status", "total"],
        },
      },
      authorize: ({ tenantId }) => ({
        allowed: tenantId === "tenant-prometheus",
        reason: "Tenant scope denied",
      }),
      requestApproval: () => false,
      onDecision: (decision) => {
        const outcome = classifyDecision(decision);
        if (!outcome) return;
        setOutcomes((current) => {
          const next = [...current, outcome];
          window.__A2UI_TEST_STATE__.outcomes = next;
          return next;
        });
        const entity = graph.getState().readEntity("Order", "order-3000");
        setGraphStatus(
          decision.status === "executed" && entity
            ? `Canonical graph: Order order-3000 is ${String(entity.status)}`
            : decision.reason ?? "Action denied",
        );
      },
    });
    return createPrometheusA2uiRuntime({ actionPolicy: policy });
  }, []);

  useEffect(() => {
    runtime.processMessages([
      {
        version: "v0.9.1",
        createSurface: {
          surfaceId: "release-review",
          catalogId: PROMETHEUS_A2UI_CATALOG_ID,
          sendDataModel: true,
        },
      },
      {
        version: "v0.9.1",
        updateComponents: {
          surfaceId: "release-review",
          components: [
            {
              id: "root",
              component: "Column",
              children: ["surface-kicker", "surface-title", "surface-copy", "actions"],
              align: "stretch",
            },
            {
              id: "surface-kicker",
              component: "Text",
              text: "OFFICIAL CATALOG SURFACE",
              variant: "caption",
            },
            {
              id: "surface-title",
              component: "Text",
              text: { path: "/title" },
              variant: "h2",
            },
            {
              id: "surface-copy",
              component: "Text",
              text: { path: "/description" },
              variant: "body",
            },
            {
              id: "actions",
              component: "Column",
              children: ["save-action", "restricted-action", "delete-action"],
              align: "stretch",
            },
            {
              id: "save-action",
              component: "Button",
              child: "save-label",
              variant: "primary",
              accessibility: { label: "Save allowlisted order" },
              action: {
                event: {
                  name: ENTITY_GRAPH_A2UI_ACTIONS.upsert,
                  context: {
                    entityType: "Order",
                    entityId: "order-3000",
                    tenantId: "tenant-prometheus",
                    data: { status: "approved", total: 3000 },
                  },
                },
              },
            },
            { id: "save-label", component: "Text", text: "Save allowlisted order" },
            {
              id: "restricted-action",
              component: "Button",
              child: "restricted-label",
              variant: "default",
              accessibility: { label: "Attempt restricted field" },
              action: {
                event: {
                  name: ENTITY_GRAPH_A2UI_ACTIONS.upsert,
                  context: {
                    entityType: "Order",
                    entityId: "order-3000",
                    tenantId: "tenant-prometheus",
                    data: { secret: "must-not-write" },
                  },
                },
              },
            },
            { id: "restricted-label", component: "Text", text: "Attempt restricted field" },
            {
              id: "delete-action",
              component: "Button",
              child: "delete-label",
              variant: "borderless",
              accessibility: { label: "Request destructive delete" },
              action: {
                event: {
                  name: ENTITY_GRAPH_A2UI_ACTIONS.remove,
                  context: {
                    entityType: "Order",
                    entityId: "order-3000",
                    tenantId: "tenant-prometheus",
                  },
                },
              },
            },
            { id: "delete-label", component: "Text", text: "Request destructive delete" },
          ],
        },
      },
      {
        version: "v0.9.1",
        updateDataModel: {
          surfaceId: "release-review",
          path: "/",
          value: {
            title: "Agent-proposed order review",
            description:
              "Every interaction below is rendered by the official A2UI engine and crosses the Prometheus policy boundary.",
          },
        },
      },
    ]);

    window.__A2UI_TEST_STATE__.ready = true;
    const scan = window.setTimeout(async () => {
      const result = await axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
        },
      });
      window.__A2UI_TEST_STATE__.axe = {
        critical: result.violations.filter(({ impact }) => impact === "critical").length,
        serious: result.violations.filter(({ impact }) => impact === "serious").length,
        incompleteCriticalOrSerious: result.incomplete.filter(
          ({ impact }) => impact === "critical" || impact === "serious",
        ).length,
        violations: result.violations.map(({ id, impact, description }) => ({
          id,
          impact,
          description,
        })),
        incomplete: result.incomplete.map(({ id, impact, description, nodes }) => ({
          id,
          impact,
          description,
          targets: nodes.flatMap(({ target }) => target.map(String)),
        })),
      };
    }, 500);

    return () => {
      window.clearTimeout(scan);
      runtime.dispose();
    };
  }, [runtime]);

  return (
    <div className="app-shell">
      <header className="masthead">
        <a className="brand" href="#main-content" aria-label="Prometheus A2UI certification home">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>Prometheus</span>
        </a>
        <div className="protocol-chip">A2UI {PROMETHEUS_A2UI_PROTOCOL_VERSION}</div>
      </header>

      <main id="main-content">
        <section className="hero" aria-labelledby="page-title">
          <p className="eyebrow">3.0 RELEASE CERTIFICATION</p>
          <h1 id="page-title">Official UI. Explicit authority.</h1>
          <p className="lede">
            The agent describes a surface. The official engine renders it. Prometheus decides
            whether an entity action may cross into the canonical graph.
          </p>
          <dl className="proof-grid" aria-label="Certification boundaries">
            <div><dt>Renderer</dt><dd>Official engine</dd></div>
            <div><dt>Catalog</dt><dd>Allowlisted</dd></div>
            <div><dt>Actions</dt><dd>Default deny</dd></div>
          </dl>
        </section>

        <div className="workspace-grid">
          <section className="surface-panel" aria-labelledby="surface-panel-title">
            <div className="panel-heading">
              <div>
                <p className="panel-index">01 / LIVE SURFACE</p>
                <h2 id="surface-panel-title">Agent-rendered proposal</h2>
              </div>
              <span className="status status-ready">Validated</span>
            </div>
            <PrometheusA2uiProvider runtime={runtime}>
              <PrometheusA2uiSurface
                className="official-surface"
                surfaceId="release-review"
                fallback={<p role="status">Hydrating official surface…</p>}
              />
            </PrometheusA2uiProvider>
          </section>

          <aside className="audit-panel" aria-labelledby="audit-title">
            <div className="panel-heading">
              <div>
                <p className="panel-index">02 / POLICY RECEIPT</p>
                <h2 id="audit-title">Authorization outcomes</h2>
              </div>
            </div>
            <p className="graph-status" aria-live="polite">{graphStatus}</p>
            <ol className="audit-list" aria-label="Action decision log">
              {outcomes.length === 0 ? (
                <li className="audit-empty">Use Tab and Enter to exercise the policy boundary.</li>
              ) : outcomes.map((outcome, index) => (
                <li className={`audit-${outcome}`} key={`${outcome}-${index}`}>
                  <span>
                    <strong>{outcome === "executed" ? "Executed" : "Denied"}</strong>
                    {outcome === "executed" && " — allowlisted tenant and fields"}
                    {outcome === "unauthorized-field" && " — field not allowlisted"}
                    {outcome === "approval-denied" && " — destructive approval denied"}
                  </span>
                </li>
              ))}
            </ol>
            <p className="assurance-note">Protocol validity never grants application authority.</p>
          </aside>
        </div>
      </main>

      <footer>
        <span>Built artifact: packages/a2ui-react/dist/index.mjs</span>
        <span>Keyboard + WCAG 2.2 AA evidence</span>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
