import type {SearchIndex} from '../types';

export async function loadSearchIndex(indexUrl: string): Promise<SearchIndex> {
  const response = await fetch(indexUrl);
  if (!response.ok) throw new Error(`search index returned ${response.status}`);
  return response.json() as Promise<SearchIndex>;
}
