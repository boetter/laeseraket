import test from 'node:test';
import assert from 'node:assert/strict';
import { OUTBOX_KEY, STORAGE_KEY } from '../src/config.js';
import { loadLocal, synchronize } from '../src/sync.js';
import { createBook, mergeStates } from '../src/state.js';
import { LEGACY_PRIZE_TIME, LEGACY_STORAGE_KEY } from '../src/legacy.js';

const withStorage = values => { global.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; return values; };

test('en enhed uden v1-data henter familiens præmie fra serveren', () => {
  withStorage(new Map());
  const local = loadLocal();
  assert.equal(local.prizeUpdatedAt, '', 'uden v1-data må præmien ikke være tidsstemplet');
  assert.equal(mergeStates(local, { books: [], prize: 'Tur i biffen', prizeUpdatedAt: LEGACY_PRIZE_TIME }).prize, 'Tur i biffen');
});

test('v1-data i browseren migreres og lægges i udbakken', () => {
  const values = withStorage(new Map());
  values.set(LEGACY_STORAGE_KEY, JSON.stringify({ books: [{ id: 1_754_000_000_000, t: 'Hobbitten', a: 'Tolkien', p: 310, r: 'jacob', e: '😍', c: '', d: '2026-08-05' }], prize: 'Tur i biffen' }));
  const local = loadLocal();
  assert.equal(local.books[0].title, 'Hobbitten');
  assert.equal(local.prize, 'Tur i biffen');
  assert.equal(JSON.parse(values.get(STORAGE_KEY)).books.length, 1);
  assert.equal(JSON.parse(values.get(OUTBOX_KEY)).length, 1, 'bogen skal sendes videre til den fælles log');
});

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
