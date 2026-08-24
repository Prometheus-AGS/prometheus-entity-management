import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

const capabilities = [
  {
    label: 'Normalized graph',
    title: 'Core',
    description:
      'Entities live exactly once. Lists store ordered IDs, never copies — one update re-renders every view that reads the entity.',
    to: '/docs/product/architecture',
  },
  {
    label: 'React 19 bindings',
    title: 'Entity Graph React',
    description:
      'Hooks, CRUD, UI tables, and devtools over the framework-neutral core, certified against React 19.',
    to: '/docs/packages/overview',
  },
  {
    label: 'Local-first sync',
    title: 'Sync & persistence',
    description:
      'Durable offline writes, conflict-aware replication, and realtime coalescing behind the same graph contract.',
    to: '/docs/packages/overview',
  },
  {
    label: 'Every framework',
    title: 'Svelte · Solid · Alpine · HTMX · Flutter',
    description:
      'One entity graph with certified bindings across web, desktop, mobile, and agentic A2UI surfaces.',
    to: '/docs/examples/overview',
  },
];

const exploreLinks = [
  {
    title: 'Understand the architecture',
    description: 'See why the graph — not the query — owns your data.',
    to: '/docs/product/architecture',
  },
  {
    title: 'Pick your packages',
    description: 'Twelve npm packages, one Dart package, and two Rust crates from one source.',
    to: '/docs/packages/overview',
  },
  {
    title: 'Run a certified example',
    description: 'Vite, Next.js, agentic A2UI, Flutter, and Tauri — all gated by the release pipeline.',
    to: '/docs/examples/overview',
  },
];

export default function Home() {
  return (
    <Layout
      title="Prometheus Entity Management"
      description="A normalized, globally reactive entity graph store for every framework — certified from a single source of truth"
    >
      <main className={styles.main}>
        <section className={styles.hero} aria-labelledby="home-title">
          <div className={`container ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Prometheus Entity Management 3.0</p>
              <h1 id="home-title">One entity graph. Every framework. Zero silos.</h1>
              <p className={styles.lead}>
                Stop letting queries own your data. Prometheus keeps a single normalized entity
                graph as the source of truth, so updating one entity in one place updates every
                view that reads it — on web, desktop, mobile, and agentic surfaces.
              </p>
              <div className={styles.actions}>
                <Link
                  className={`button button--primary button--lg ${styles.primaryAction}`}
                  to="/docs/product/overview"
                >
                  Get started
                </Link>
                <Link
                  className={`button button--secondary button--lg ${styles.secondaryAction}`}
                  to="/docs/packages/overview"
                >
                  Browse packages
                </Link>
              </div>
            </div>

            <aside className={styles.releaseCard} aria-labelledby="release-card-title">
              <p className={styles.cardKicker}>3.0 release</p>
              <h2 id="release-card-title">One certified source, every supported surface.</h2>
              <dl className={styles.metrics}>
                <div>
                  <dt>12</dt>
                  <dd>npm packages</dd>
                </div>
                <div>
                  <dt>1</dt>
                  <dd>Dart package</dd>
                </div>
                <div>
                  <dt>2</dt>
                  <dd>Rust crates</dd>
                </div>
              </dl>
              <Link className={styles.inlineLink} to="/docs/examples/overview">
                See the certification model <span aria-hidden="true">→</span>
              </Link>
            </aside>
          </div>
        </section>

        <section className={styles.featured} aria-labelledby="featured-title">
          <div className="container">
            <div className={styles.featuredCapability}>
              <div>
                <p className={styles.eyebrow}>The entity graph</p>
                <h2 id="featured-title">Queries are instructions, not containers.</h2>
                <p>
                  <code>useEntity</code> and <code>useEntityList</code> describe what to fetch and
                  how to normalize it. The graph owns the data; lists hold ordered IDs and join
                  against the graph at render time. That is what makes cross-view reactivity
                  possible without cache invalidation guesswork.
                </p>
              </div>
              <nav className={styles.featuredLinks} aria-label="Entity graph resources">
                <Link to="/docs/product/architecture">Read the architecture</Link>
                <Link to="/docs/packages/overview">Choose a binding</Link>
                <Link to="/docs/examples/overview">See it running</Link>
              </nav>
            </div>
          </div>
        </section>

        <section className={styles.capabilities} aria-labelledby="capabilities-title">
          <div className="container">
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Core capabilities</p>
              <h2 id="capabilities-title">A deterministic path from server to screen.</h2>
            </div>
            <div className={styles.cardGrid}>
              {capabilities.map(capability => (
                <Link className={styles.capabilityCard} key={capability.title} to={capability.to}>
                  <span className={styles.cardLabel}>{capability.label}</span>
                  <h3>{capability.title}</h3>
                  <p>{capability.description}</p>
                  <span className={styles.cardArrow} aria-hidden="true">
                    Explore →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.explore} aria-labelledby="explore-title">
          <div className="container">
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Go deeper</p>
              <h2 id="explore-title">Start with the path that matches your stack.</h2>
            </div>
            <div className={styles.exploreGrid}>
              {exploreLinks.map(item => (
                <Link className={styles.exploreLink} key={item.title} to={item.to}>
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
