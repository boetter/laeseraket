import { EMOJIS, READERS } from './config.js';

export const uuid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();

export function validBook(book) {
  return book && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(book.id) &&
    typeof book.title === 'string' && book.title.trim().length > 0 && book.title.length <= 160 &&
    typeof book.author === 'string' && book.author.length <= 120 &&
    Number.isInteger(book.pages) && book.pages >= 1 && book.pages <= 10_000 &&
    READERS.some(reader => reader.id === book.reader) && EMOJIS.includes(book.emoji) &&
    /^\d{4}-\d{2}-\d{2}$/.test(book.date) && !Number.isNaN(Date.parse(`${book.date}T00:00:00Z`)) &&
    typeof book.comment === 'string' && book.comment.length <= 500 &&
    typeof book.createdAt === 'string' && !Number.isNaN(Date.parse(book.createdAt)) &&
    typeof book.updatedAt === 'string' && !Number.isNaN(Date.parse(book.updatedAt)) &&
    (book.deletedAt == null || (typeof book.deletedAt === 'string' && !Number.isNaN(Date.parse(book.deletedAt))));
}

export function sanitizeState(value = {}) {
  return {
    books: Array.isArray(value.books) ? value.books.filter(validBook) : [],
    prize: typeof value.prize === 'string' ? value.prize.slice(0, 200) : '',
    prizeUpdatedAt: typeof value.prizeUpdatedAt === 'string' ? value.prizeUpdatedAt : '',
    celebrated: Array.isArray(value.celebrated) ? value.celebrated.filter(n => [25, 50, 75, 100].includes(n)) : [],
    muted: Boolean(value.muted)
  };
}

export function mergeStates(local, remote) {
  const merged = sanitizeState(local);
  const byId = new Map(merged.books.map(book => [book.id, book]));
  for (const book of sanitizeState(remote).books) {
    const existing = byId.get(book.id);
    if (!existing || book.updatedAt > existing.updatedAt) byId.set(book.id, book);
  }
  merged.books = [...byId.values()];
  if ((remote?.prizeUpdatedAt || '') > merged.prizeUpdatedAt) {
    merged.prize = remote.prize;
    merged.prizeUpdatedAt = remote.prizeUpdatedAt;
  }
  merged.celebrated = [...new Set([...merged.celebrated, ...(remote?.celebrated || [])])];
  return merged;
}

export function createBook(fields, timestamp = now(), id = uuid()) {
  return { id, title: fields.title.trim(), author: fields.author.trim(), pages: Number(fields.pages), reader: fields.reader,
    emoji: fields.emoji, comment: fields.comment.trim(), date: fields.date, createdAt: timestamp, updatedAt: timestamp, deletedAt: null };
}

export function applyOperation(state, operation) {
  const next = sanitizeState(state);
  if (operation.type === 'upsert' && validBook(operation.book)) return mergeStates(next, { books: [operation.book] });
  if (operation.type === 'settings' && typeof operation.prize === 'string') return mergeStates(next, { prize: operation.prize.slice(0, 200), prizeUpdatedAt: operation.updatedAt });
  return next;
}

export const visibleBooks = state => state.books.filter(book => !book.deletedAt);
