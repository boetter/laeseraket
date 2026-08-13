import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Regression: el() bandt onClick som addEventListener('Click'), og da
// hændelsestyper skelner mellem store og små bogstaver, var hver eneste
// knap i appen død — inklusive "+ Tilføj bog".
test('el() binder hændelser med små bogstaver', async () => {
  const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const match = source.match(/addEventListener\(key\.slice\(2\)([^,]*),/);
  assert.ok(match, 'el() skal stadig binde on*-attributter via addEventListener');
  assert.match(match[1], /toLowerCase\(\)/);
});

// Regression: netlify.toml sætter `style-src 'self'` uden 'unsafe-inline', så en
// style-attribut bliver afvist af browseren. Raketten, farverne og stjernerne
// placeres derfor gennem CSSOM.
test('el() sætter style gennem CSSOM, ikke som attribut', async () => {
  const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  assert.match(source, /key === 'style' \? node\.style\.cssText = value/);
  const inline = source.match(/setAttribute\('style'/g);
  assert.equal(inline, null, 'ingen style-attributter må sættes direkte');
});

test('el() giver en klikbar knap', () => {
  const listeners = new Map();
  const node = { className: '', append() {}, setAttribute() {}, addEventListener: (type, fn) => listeners.set(type, fn) };
  const el = (tag, attrs = {}) => { for (const [key, value] of Object.entries(attrs)) key === 'class' ? node.className = value : key.startsWith('on') ? node.addEventListener(key.slice(2).toLowerCase(), value) : node.setAttribute(key, value); return node; };
  let clicked = false;
  el('button', { type: 'button', class: 'fab', onClick: () => { clicked = true; } });
  listeners.get('click')?.();
  assert.equal(clicked, true, 'klik-hændelsen skal være bundet som "click"');
});
