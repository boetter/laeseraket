import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeOperations, validateOperation } from '../netlify/functions/validation.mjs';

const base = { operationId: '123e4567-e89b-42d3-a456-426614174010', type: 'upsert', createdAt: '2026-08-10T10:00:00.000Z', book: { id: '123e4567-e89b-42d3-a456-426614174000', title: 'Bog', author: '', pages: 10, reader: 'hugo', emoji: '😂', comment: '', date: '2026-08-10', createdAt: '2026-08-10T10:00:00.000Z', updatedAt: '2026-08-10T10:00:00.000Z', deletedAt: null } };
test('server accepts complete valid operations', () => assert.equal(validateOperation(base).ok, true));
test('server rejects unknown readers, huge pages, HTML emoji and long fields', () => {
  for (const book of [{ ...base.book, reader: 'attacker' }, { ...base.book, pages: 1e9 }, { ...base.book, emoji: '<script>alert(1)</script>' }, { ...base.book, title: 'x'.repeat(161) }]) assert.equal(validateOperation({ ...base, book }).ok, false);
});
test('operation log is idempotent and resolves latest versions', () => {
  const newer = { ...base, operationId: '123e4567-e89b-42d3-a456-426614174011', createdAt: '2026-08-11T10:00:00.000Z', book: { ...base.book, pages: 20, updatedAt: '2026-08-11T10:00:00.000Z' } };
  assert.equal(mergeOperations([newer, base]).books[0].pages, 20);
});
