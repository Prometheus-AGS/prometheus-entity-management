import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

const foundations = [
  {
    title: 'Normalize once',
    text: 'Entities live at one type-and-ID address. Lists keep ordered IDs, so a single write updates every projection.',
  },
  {
    title: 'Bring your transport',
    text: 'REST, GraphQL, WebSocket, Supabase, Flint, and local-first transports all populate the same graph.',
  },
  {
    title: 'Project everywhere',
    text: 'React, Flutter, web components, lightweight bindings, desktop, and mobile read one architectural contract.',
  },
];

const tracks = [
  ['React 19 + Vite 8', '/docs/3.x/frameworks/react-vite/'],
  ['Flutter + Riverpod 3', '/docs/3.x/frameworks/flutter-riverpod/'],
  ['Flint Realtime Fabric', '/docs/3.x/integrations/flint-realtime-fabric/'],
  ['All examples', '/docs/3.x/examples/'],
] as const;

function Home(): ReactNode {
  return (
    <Layout
      title="One entity graph. Every framework."
      description="Normalized entity management for realtime, local-first web, mobile, and desktop applications."
    >
      <main>
        <header className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <span className="release-pill">3.0 RC documentation</span>
              <Heading as="h1">One entity graph. Every framework. Realtime everywhere.</Heading>
              <p>
                Build entity-driven applications without query-owned data silos. Prometheus Entity
                Management keeps canonical data, local patches, lists, realtime changes, and offline
                convergence inspectable and consistent across every view.
              </p>
              <div className={styles.actions}>
                <Link className="button button--primary button--lg" to="/docs/3.x/start-here/">
                  Start building
                </Link>
                <Link className="button button--secondary button--lg" to="/docs/3.x/concepts/">
                  Understand the graph
                </Link>
              </div>
            </div>
            <div className={styles.graphCard} aria-label="Entity graph data flow illustration">
              <span className={styles.graphLabel}>Views submit intent</span>
              <div className={styles.nodes} aria-hidden="true">
                <span>List</span><i /><span>Graph</span><i /><span>Detail</span>
              </div>
              <strong>Project/User/Task</strong>
              <code>entities[type][id]</code>
              <span className={styles.graphLabel}>Services populate state</span>
            </div>
          </div>
        </header>

        <section className={styles.section} aria-labelledby="foundation-heading">
          <Heading as="h2" id="foundation-heading">A durable application data model</Heading>
          <div className={styles.cardGrid}>
            {foundations.map((item) => (
              <article className={styles.card} key={item.title}>
                <Heading as="h3">{item.title}</Heading>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={clsx(styles.section, styles.trackSection)} aria-labelledby="track-heading">
          <div>
            <span className={styles.eyebrow}>Verified progressive documentation</span>
            <Heading as="h2" id="track-heading">Choose a path, keep one architecture</Heading>
            <p>
              Each framework guide follows View → Hook/ViewModel → Store → Service → External. The
              implementation changes; entity identity and trust boundaries do not.
            </p>
          </div>
          <nav className={styles.trackLinks} aria-label="Featured documentation tracks">
            {tracks.map(([label, to]) => <Link key={to} to={to}>{label}<span aria-hidden="true">→</span></Link>)}
          </nav>
        </section>
      </main>
    </Layout>
  );
}

export default Home;
