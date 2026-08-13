import { OUTBOX_KEY, STORAGE_KEY } from './config.js';
import { LEGACY_STORAGE_KEY, migrateLegacyState } from './legacy.js';
import { applyOperation, mergeStates, sanitizeState, now, uuid } from './state.js';

const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
export const loadOutbox = () => read(OUTBOX_KEY, []);
export const saveLocal = state => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
export const queue = operation => localStorage.setItem(OUTBOX_KEY, JSON.stringify([...loadOutbox(), operation]));

export function loadLocal() {
  const stored = read(STORAGE_KEY, null);
  if (stored) return sanitizeState(stored);
  const legacy = read(LEGACY_STORAGE_KEY, null);
  const migrated = legacy ? sanitizeState(migrateLegacyState(legacy)) : sanitizeState({});
  // Uden v1-data må der ikke sættes et migrerings-tidsstempel på præmien —
  // så ville enheden se sig selv som lige så opdateret som serveren.
  if (!migrated.books.length && !migrated.prize) return sanitizeState({});
  // Bøger fra v1 lægges i udbakken, så en enhed der aldrig nåede at
  // synkronisere også får sine bøger op i familiens fælles log.
  saveLocal(migrated);
  for (const book of migrated.books) queue({ operationId: uuid(), type: 'upsert', createdAt: now(), book });
  return migrated;
}

export async function synchronize(state, onStatus = () => {}) {
  let current = state;
  let pending = loadOutbox();
  onStatus({ pending: pending.length, phase: 'syncing' });
  try {
    // The outbox is deliberately uploaded before the server snapshot is read.
    for (const operation of pending) {
      const response = await fetch('/api/operations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(operation) });
      if (!response.ok) throw new Error('upload failed');
      pending = pending.filter(item => item.operationId !== operation.operationId);
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(pending));
    }
    const response = await fetch('/api/state', { cache: 'no-store' });
    if (!response.ok) throw new Error('download failed');
    current = mergeStates(current, await response.json());
    saveLocal(current);
    onStatus({ pending: 0, phase: 'online', lastSync: new Date() });
  } catch {
    onStatus({ pending: pending.length, phase: 'offline' });
  }
  return current;
}

export function commit(state, operation) {
  const next = applyOperation(state, operation);
  saveLocal(next);
  queue(operation);
  return next;
}
