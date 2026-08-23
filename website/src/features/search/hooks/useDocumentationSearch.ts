import {useEffect, useMemo, useState, useSyncExternalStore} from 'react';
import {createSearchIndexStore} from '../stores/searchIndexStore';

export function useDocumentationSearch(indexUrl: string) {
  const store = useMemo(() => createSearchIndexStore(indexUrl), [indexUrl]);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [query, setQuery] = useState('');

  useEffect(() => {
    void store.load();
  }, [store]);

  const results = useMemo(() => {
    const tokens = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return snapshot.records.slice(0, 12);
    return snapshot.records
      .filter((record) => tokens.every((token) => `${record.title} ${record.text}`.toLocaleLowerCase().includes(token)))
      .slice(0, 20);
  }, [query, snapshot.records]);

  return {
    error: snapshot.status === 'error',
    query,
    records: snapshot.records,
    results,
    setQuery,
  };
}
