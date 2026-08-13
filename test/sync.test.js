import test from 'node:test';
import assert from 'node:assert/strict';
import { OUTBOX_KEY } from '../src/config.js';
import { synchronize } from '../src/sync.js';
import { createBook } from '../src/state.js';

test('offline outbox is uploaded before remote state is merged', async () => {
  const values = new Map();
  global.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const localBook = createBook({ title: 'Offline', author: '', pages: 12, reader: 'marie', emoji: '🤩', comment: '', date: '2026-08-10' }, '2026-08-10T10:00:00.000Z', '123e4567-e89b-42d3-a456-426614174000');
  const op = { operationId: '123e4567-e89b-42d3-a456-426614174010', type: 'upsert', createdAt: localBook.createdAt, book: localBook };
  values.set(OUTBOX_KEY, JSON.stringify([op]));
  const calls = [];
  global.fetch = async (url, options = {}) => { calls.push([url, options.method || 'GET']); return url.includes('operations') ? { ok: true } : { ok: true, json: async () => ({ books: [] }) }; };
  const result = await synchronize({ books: [localBook] });
  assert.deepEqual(calls, [['/api/operations', 'POST'], ['/api/state', 'GET']]);
  assert.equal(result.books[0].title, 'Offline');
  assert.deepEqual(JSON.parse(values.get(OUTBOX_KEY)), []);
});
