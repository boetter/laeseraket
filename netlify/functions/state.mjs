import { getStore } from '@netlify/blobs';

const emptyState = { books: [], prize: '', celebrated: [], muted: false };

function clean(value) {
  if (!value || typeof value !== 'object') return emptyState;
  return {
    books: Array.isArray(value.books) ? value.books.slice(-2000) : [],
    prize: typeof value.prize === 'string' ? value.prize.slice(0, 200) : '',
    celebrated: Array.isArray(value.celebrated) ? value.celebrated.filter(n => [25, 50, 75, 100].includes(n)) : [],
    muted: Boolean(value.muted)
  };
}

export default async (request) => {
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
  const store = getStore('familie-laeseraket');
  if (request.method === 'GET') {
    const state = await store.get('state', { type: 'json' });
    return new Response(JSON.stringify(clean(state)), { headers });
  }
  if (request.method === 'PUT') {
    let value;
    try { value = clean(await request.json()); } catch { return new Response('{"error":"Ugyldig JSON"}', { status: 400, headers }); }
    await store.setJSON('state', value);
    return new Response(JSON.stringify(value), { headers });
  }
  return new Response('{"error":"Metoden understøttes ikke"}', { status: 405, headers: { ...headers, allow: 'GET, PUT' } });
};
