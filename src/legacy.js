import { EMOJIS, READERS } from './config.js';

// Version 1 gemte {id: Date.now(), t, a, p, r, e, c, d} under en anden localStorage-nøgle
// og i en anden blob-store. Uden denne oversættelse ser v2 en tom logbog.
export const LEGACY_STORAGE_KEY = 'familielaeseraket-2026';
export const LEGACY_STORE = 'familie-laeseraket';
export const LEGACY_BLOB_KEY = 'state';
// Den migrerede præmie skal kunne overtages af enhederne, men altid tabe til
// en præmie der er sat i v2 — derfor et tidsstempel der ligger før alt andet.
export const LEGACY_PRIZE_TIME = '1970-01-01T00:00:00.000Z';

const MAX_TIME = 8.64e15;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const hash = seed => { let value = 0x811c9dc5; for (let i = 0; i < seed.length; i++) { value ^= seed.charCodeAt(i); value = Math.imul(value, 0x01000193) >>> 0; } return value.toString(16).padStart(8, '0'); };

// Samme numeriske id skal give samme UUID på alle enheder og på serveren,
// ellers ville hver enhed migrere den samme bog til hver sin kopi.
export function legacyUuid(legacyId) {
  const hex = [0, 1, 2, 3].map(block => hash(`laeseraket-legacy:${legacyId}:${block}`)).join('');
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function migrateLegacyBook(book) {
  if (!book || typeof book !== 'object') return null;
  const legacyId = Number(book.id);
  const title = String(book.t ?? '').trim().slice(0, 160);
  const pages = Math.trunc(Number(book.p));
  if (!Number.isFinite(legacyId) || Math.abs(legacyId) > MAX_TIME) return null;
  if (!title || !Number.isFinite(pages) || pages < 1 || pages > 10_000) return null;
  if (!READERS.some(reader => reader.id === book.r)) return null;
  const timestamp = new Date(legacyId).toISOString();
  const dated = DATE.test(book.d || '') && !Number.isNaN(Date.parse(`${book.d}T00:00:00Z`));
  return {
    id: legacyUuid(legacyId),
    title,
    author: String(book.a ?? '').trim().slice(0, 120),
    pages,
    reader: book.r,
    emoji: EMOJIS.includes(book.e) ? book.e : EMOJIS[0],
    comment: String(book.c ?? '').trim().slice(0, 500),
    date: dated ? book.d : timestamp.slice(0, 10),
    // Migrerede poster får deres oprindelige tidsstempel, så enhver senere
    // rettelse eller sletning i v2 altid vinder ved sammenfletning.
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null
  };
}

export function migrateLegacyState(value) {
  const legacy = value && typeof value === 'object' ? value : {};
  return {
    books: (Array.isArray(legacy.books) ? legacy.books : []).map(migrateLegacyBook).filter(Boolean),
    prize: typeof legacy.prize === 'string' ? legacy.prize.slice(0, 200) : '',
    prizeUpdatedAt: LEGACY_PRIZE_TIME,
    celebrated: Array.isArray(legacy.celebrated) ? legacy.celebrated.filter(n => [25, 50, 75, 100].includes(n)) : [],
    muted: Boolean(legacy.muted)
  };
}
