import { getStore } from '@netlify/blobs';
import { validateOperation } from './validation.mjs';

const MAX_BYTES = 16_384;
export default async request => {
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Metoden understøttes ikke' }), { status: 405, headers: { ...headers, allow: 'POST' } });
  if (Number(request.headers.get('content-length') || 0) > MAX_BYTES) return new Response(JSON.stringify({ error: 'Anmodningen er for stor' }), { status: 413, headers });
  let operation;
  try { operation = await request.json(); } catch { return new Response(JSON.stringify({ error: 'Ugyldig JSON' }), { status: 400, headers }); }
  const result = validateOperation(operation);
  if (!result.ok) return new Response(JSON.stringify({ error: result.error }), { status: 422, headers });
  const store = getStore('familie-laeseraket-v2');
  // UUID keys make independent device writes append-only rather than last-write-wins.
  await store.setJSON(`operations/${operation.operationId}`, operation, { onlyIfNew: true });
  await store.setJSON(`snapshots/${new Date().toISOString().slice(0, 10)}/${operation.operationId}`, operation, { onlyIfNew: true });
  return new Response(JSON.stringify({ ok: true }), { status: 201, headers });
};
