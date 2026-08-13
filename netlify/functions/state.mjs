import { getStore } from '@netlify/blobs';
import { emptyState, mergeOperations } from './validation.mjs';

export default async request => {
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
  if (request.method !== 'GET') return new Response(JSON.stringify({ error: 'Metoden understøttes ikke' }), { status: 405, headers: { ...headers, allow: 'GET' } });
  const store = getStore('familie-laeseraket-v2');
  const { blobs } = await store.list({ prefix: 'operations/' });
  const operations = await Promise.all(blobs.slice(-5000).map(blob => store.get(blob.key, { type: 'json' })));
  return new Response(JSON.stringify(mergeOperations(operations.filter(Boolean), emptyState())), { headers });
};
