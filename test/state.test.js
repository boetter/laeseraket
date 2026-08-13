import test from 'node:test';
import assert from 'node:assert/strict';
import { applyOperation, createBook, mergeStates, validBook } from '../src/state.js';

const id1 = '123e4567-e89b-42d3-a456-426614174000';
const id2 = '123e4567-e89b-42d3-a456-426614174001';
const fields = { title: 'Mumitroldene', author: 'Tove Jansson', pages: 180, reader: 'marie', emoji: '🤩', comment: '', date: '2026-08-10' };
test('two devices can add concurrently without losing either book', () => {
  const a = { books: [createBook(fields, '2026-08-10T10:00:00.000Z', id1)] };
  const b = { books: [createBook({ ...fields, title: 'Hobbitten' }, '2026-08-10T10:00:01.000Z', id2)] };
  assert.deepEqual(mergeStates(a, b).books.map(book => book.title).sort(), ['Hobbitten', 'Mumitroldene']);
});
test('newest edit or tombstone wins by UUID and updatedAt', () => {
  const original = createBook(fields, '2026-08-10T10:00:00.000Z', id1);
  const edited = { ...original, title: 'Rettet', updatedAt: '2026-08-11T10:00:00.000Z' };
  const deleted = { ...original, deletedAt: '2026-08-12T10:00:00.000Z', updatedAt: '2026-08-12T10:00:00.000Z' };
  assert.equal(mergeStates({ books: [original] }, { books: [edited] }).books[0].title, 'Rettet');
  assert.equal(mergeStates({ books: [edited] }, { books: [deleted] }).books[0].deletedAt, deleted.deletedAt);
});
test('malformed and script-bearing records are rejected', () => {
  const bad = createBook({ ...fields, emoji: '<img src=x onerror=alert(1)>' }, '2026-08-10T10:00:00.000Z', id1);
  assert.equal(validBook(bad), false);
  assert.equal(applyOperation({ books: [] }, { type: 'upsert', book: bad }).books.length, 0);
});
