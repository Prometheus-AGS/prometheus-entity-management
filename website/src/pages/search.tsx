import {type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Heading from '@theme/Heading';
import Layout from '@theme/Layout';
import {useDocumentationSearch} from '../features/search/hooks/useDocumentationSearch';
import styles from './search.module.css';

export default function SearchPage(): ReactNode {
  const indexUrl = useBaseUrl('/search-index.json');
  const {error, query, records, results, setQuery} = useDocumentationSearch(indexUrl);

  return (
    <Layout title="Search" description="Search Prometheus Entity Management documentation locally.">
      <main className={styles.searchPage}>
        <Heading as="h1">Search the documentation</Heading>
        <p>The index ships with the site. Queries and results stay in this browser.</p>
        <label htmlFor="documentation-search">Search terms</label>
        <input
          id="documentation-search"
          className={styles.searchInput}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
        <p aria-live="polite">
          {error ? 'Search index unavailable.' : records.length ? `${results.length} results` : 'Loading search index…'}
        </p>
        <ul className={styles.results}>
          {results.map((result) => (
            <li key={result.route}>
              <Link className={styles.result} to={result.route}>
                <strong>{result.title}</strong>
                <span>{result.summary}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </Layout>
  );
}
