const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const READERS = new Set(['marie', 'jacob', 'alfred', 'hugo']);
const EMOJIS = new Set(['🤩', '😍', '😂', '😭', '😱', '🥱']);
const iso = value => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const date = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
export const emptyState = () => ({ books: [], prize: '', prizeUpdatedAt: '', celebrated: [], muted: false });

export function validateBook(book) {
  if (!book || typeof book !== 'object' || !UUID.test(book.id || '')) return 'Bog-id skal være et UUID';
  if (typeof book.title !== 'string' || !book.title.trim() || book.title.length > 160) return 'Titlen skal være 1–160 tegn';
  if (typeof book.author !== 'string' || book.author.length > 120) return 'Forfatteren må højst være 120 tegn';
  if (!Number.isInteger(book.pages) || book.pages < 1 || book.pages > 10_000) return 'Sidetal skal være et heltal mellem 1 og 10.000';
  if (!READERS.has(book.reader)) return 'Ukendt læser';
  if (!EMOJIS.has(book.emoji)) return 'Ukendt reaktion';
  if (!date(book.date)) return 'Datoen er ugyldig';
  if (typeof book.comment !== 'string' || book.comment.length > 500) return 'Kommentaren må højst være 500 tegn';
  if (!iso(book.createdAt) || !iso(book.updatedAt) || (book.deletedAt != null && !iso(book.deletedAt))) return 'Versionsdatoen er ugyldig';
  return '';
}

export function validateOperation(operation) {
  if (!operation || !UUID.test(operation.operationId || '')) return { ok: false, error: 'Operation-id skal være et UUID' };
  if (!iso(operation.createdAt)) return { ok: false, error: 'Operationens dato er ugyldig' };
  if (operation.type === 'upsert') { const error = validateBook(operation.book); return error ? { ok: false, error } : { ok: true }; }
  if (operation.type === 'settings' && typeof operation.prize === 'string' && operation.prize.length <= 200 && iso(operation.updatedAt)) return { ok: true };
  return { ok: false, error: 'Ukendt eller ugyldig operation' };
}

export function mergeOperations(operations, state = emptyState()) {
  const books = new Map(state.books.map(book => [book.id, book]));
  for (const op of operations.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))) {
    if (!validateOperation(op).ok) continue;
    if (op.type === 'upsert') { const old = books.get(op.book.id); if (!old || op.book.updatedAt > old.updatedAt) books.set(op.book.id, op.book); }
    if (op.type === 'settings' && op.updatedAt > state.prizeUpdatedAt) { state.prize = op.prize; state.prizeUpdatedAt = op.updatedAt; }
  }
  state.books = [...books.values()];
  return state;
}
