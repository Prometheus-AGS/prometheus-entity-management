import {loadSearchIndex} from '../services/loadSearchIndex';
import type {SearchRecord} from '../types';

type SearchIndexState = {
  records: SearchRecord[];
  status: 'idle' | 'loading' | 'ready' | 'error';
};

export type SearchIndexStore = {
  getSnapshot: () => SearchIndexState;
  load: () => Promise<void>;
  subscribe: (listener: () => void) => () => void;
};

export function createSearchIndexStore(indexUrl: string): SearchIndexStore {
  let state: SearchIndexState = {records: [], status: 'idle'};
  const listeners = new Set<() => void>();

  function update(next: SearchIndexState) {
    state = next;
    for (const listener of listeners) listener();
  }

  return {
    getSnapshot: () => state,
    async load() {
      if (state.status !== 'idle') return;
      update({...state, status: 'loading'});
      try {
        const index = await loadSearchIndex(indexUrl);
        update({records: index.records, status: 'ready'});
      } catch {
        update({records: [], status: 'error'});
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
