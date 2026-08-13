import test from 'node:test';
import assert from 'node:assert/strict';
import { LEGACY_PRIZE_TIME, legacyUuid, migrateLegacyBook, migrateLegacyState } from '../src/legacy.js';
import { mergeStates, validBook } from '../src/state.js';
import { mergeOperations, validateOperation } from '../netlify/functions/validation.mjs';

const legacy = { id: 1_754_000_000_000, t: 'Mumitroldene', a: 'Tove Jansson', p: 180, r: 'marie', e: '🤩', c: 'God bog', d: '2026-08-10' };

test('bøger fra v1 overlever migreringen og består valideringen', () => {
  const book = migrateLegacyBook(legacy);
  assert.equal(validBook(book), true);
  assert.equal(validateOperation({ operationId: legacyUuid(1), type: 'upsert', createdAt: book.createdAt, book }).ok, true);
  assert.deepEqual([book.title, book.author, book.pages, book.reader, book.date], ['Mumitroldene', 'Tove Jansson', 180, 'marie', '2026-08-10']);
});

test('samme v1-id giver samme UUID, så enheder ikke laver dubletter', () => {
  const a = migrateLegacyState({ books: [legacy] });
  const b = migrateLegacyState({ books: [legacy] });
  assert.equal(a.books[0].id, b.books[0].id);
  assert.notEqual(legacyUuid(1), legacyUuid(2));
  assert.equal(mergeStates(a, b).books.length, 1);
});

test('ugyldige v1-poster springes over i stedet for at vælte migreringen', () => {
  const state = migrateLegacyState({ books: [legacy, { ...legacy, id: 2, r: 'ukendt' }, { ...legacy, id: 3, t: '' }, null, { ...legacy, id: 4, p: 0 }], prize: 'Tur i biffen' });
  assert.equal(state.books.length, 1);
  assert.equal(state.prize, 'Tur i biffen');
  assert.equal(state.prizeUpdatedAt, LEGACY_PRIZE_TIME);
});

test('den gamle præmie overtages af enhederne, men taber til en ny præmie', () => {
  const base = migrateLegacyState({ books: [], prize: 'Tur i biffen' });
  assert.equal(mergeStates({ books: [] }, base).prize, 'Tur i biffen');
  const renamed = mergeOperations([{ operationId: legacyUuid('op'), type: 'settings', createdAt: '2026-08-12T10:00:00.000Z', updatedAt: '2026-08-12T10:00:00.000Z', prize: 'Legoland' }], base);
  assert.equal(renamed.prize, 'Legoland');
});

test('nye operationer vinder over den migrerede udgave af samme bog', () => {
  const base = migrateLegacyState({ books: [legacy] });
  const id = base.books[0].id;
  const edit = { operationId: legacyUuid('op'), type: 'upsert', createdAt: '2026-08-12T10:00:00.000Z', book: { ...base.books[0], pages: 200, updatedAt: '2026-08-12T10:00:00.000Z' } };
  const merged = mergeOperations([edit], base);
  assert.equal(merged.books.length, 1);
  assert.equal(merged.books[0].id, id);
  assert.equal(merged.books[0].pages, 200);
});
