import { CHALLENGE, EMOJIS, GOAL, PERSON_GOAL, READERS } from './src/config.js';
import { createBook, now, uuid, validBook, visibleBooks } from './src/state.js';
import { commit, loadLocal, loadOutbox, saveLocal, synchronize } from './src/sync.js';

let state = loadLocal(), lastFocus, displayTotal = 0, editingEmoji = EMOJIS[0], flyerTimer;
const draft = { reader: '', emoji: EMOJIS[0] };
const filters = { search: '', reader: '', month: '', emoji: '', sort: 'date' };
const calm = matchMedia('(prefers-reduced-motion: reduce)');

const $ = selector => document.querySelector(selector);
// style sættes gennem CSSOM og ikke som attribut: en streng style-src i CSP'en
// afviser inline style-attributter, og så mistede raket, farver og stjerner deres placering.
const el = (tag, attrs = {}, children = []) => { const node = document.createElement(tag); for (const [key, value] of Object.entries(attrs)) key === 'class' ? node.className = value : key === 'style' ? node.style.cssText = value : key.startsWith('on') ? node.addEventListener(key.slice(2).toLowerCase(), value) : node.setAttribute(key, value); for (const child of [].concat(children)) if (child != null && child !== false) node.append(child instanceof Node ? child : document.createTextNode(String(child))); return node; };
const button = (label, onClick, className = '') => el('button', { type: 'button', class: className, onClick }, label);
const fmt = number => Math.round(number).toLocaleString('da-DK');
const today = () => new Date().toLocaleDateString('sv-SE');
const books = () => visibleBooks(state);
const total = () => books().reduce((sum, book) => sum + book.pages, 0);
const readerOf = id => READERS.find(reader => reader.id === id) || { id: '', name: '?', color: '#fff' };
const operation = book => ({ operationId: uuid(), type: 'upsert', createdAt: now(), book });
const announce = message => { $('#notice').textContent = message; setTimeout(() => { if ($('#notice').textContent === message) $('#notice').textContent = ''; }, 5000); };

/* ---------- lyd, konfetti og stjerner ---------- */
let audioContext;
function tone(frequency, delay = 0) {
  if (state.muted) return;
  try {
    audioContext ||= new AudioContext();
    const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(), at = audioContext.currentTime + delay;
    oscillator.type = 'triangle'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at); gain.gain.exponentialRampToValueAtTime(0.14, at + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.35);
    oscillator.connect(gain).connect(audioContext.destination); oscillator.start(at); oscillator.stop(at + 0.4);
  } catch { /* lyd er pynt — appen skal virke uden */ }
}
const whoosh = () => tone(330);
const fanfare = big => [523, 659, 784, 1047, ...(big ? [1319] : [])].forEach((frequency, index) => tone(frequency, index * 0.12));

const canvas = $('#confetti'), context = canvas.getContext('2d');
let particles = [];
const sizeCanvas = () => { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; };
function burst(count) {
  if (calm.matches) return;
  const colors = ['#FF6B35', '#FFC94D', '#FF7AC3', '#6FB4FF', '#5CE08A', '#fff'];
  for (let i = 0; i < count; i++) particles.push({ x: canvas.width * 0.5, y: canvas.height * 0.3, vx: (Math.random() - 0.5) * 16, vy: Math.random() * -10 - 4, life: 1, color: colors[i % 6], size: Math.random() * 7 + 4 });
  if (particles.length === count) confettiLoop();
}
function confettiLoop() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  particles = particles.filter(particle => particle.life > 0);
  for (const particle of particles) {
    particle.x += particle.vx; particle.y += particle.vy; particle.vy += 0.22 * devicePixelRatio; particle.life -= 0.012;
    context.globalAlpha = particle.life; context.fillStyle = particle.color; context.fillRect(particle.x, particle.y, particle.size, particle.size * 0.6);
  }
  context.globalAlpha = 1;
  if (particles.length) requestAnimationFrame(confettiLoop);
}
for (let i = 0; i < 110; i++) $('#stars').append(el('i', { class: 'star', style: `left:${Math.random() * 100}%;top:${Math.random() * 100}%;width:${Math.random() * 2.2 + 1}px;height:${Math.random() * 2.2 + 1}px;--duration:${Math.random() * 3 + 2}s;--delay:${-Math.random() * 5}s` }));

/* ---------- synkronisering ---------- */
function syncStatus({ pending, phase, lastSync }) {
  const changes = `${pending} ${pending === 1 ? 'ændring' : 'ændringer'}`;
  const text = phase === 'syncing' ? `Synkroniserer…${pending ? ` ${changes} afventer` : ''}`
    : phase === 'offline' ? `Offline · ${changes} afventer synkronisering · alt er gemt på denne enhed`
    : `Familiens fælles logbog er synkroniseret kl. ${lastSync.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}`;
  $('#sync').textContent = text;
  $('#sync').className = `sync ${phase === 'online' ? 'ok' : phase}`;
}
async function sync() {
  const before = displayTotal;
  state = await synchronize(state, syncStatus);
  render();
  // Bøger fra de andre enheder skal også få raketten til at flytte sig.
  if (before !== total()) animate(before, total());
}
function save(op, message) {
  const before = total();
  state = commit(state, op);
  syncStatus({ pending: loadOutbox().length, phase: navigator.onLine ? 'syncing' : 'offline' });
  render(); animate(before, total()); announce(message); sync();
}

/* ---------- raket, tæller og milepæle ---------- */
function animate(from, to) {
  if (calm.matches) { displayTotal = to; return refreshHero(); }
  const start = performance.now();
  requestAnimationFrame(function tick(stamp) {
    const progress = Math.min((stamp - start) / 1300, 1);
    displayTotal = Math.round(from + (to - from) * (1 - (1 - progress) ** 3));
    refreshHero();
    if (progress < 1) requestAnimationFrame(tick);
  });
}
function celebrate(before, after) {
  const hit = [25, 50, 75, 100].find(mark => before / GOAL * 100 < mark && after / GOAL * 100 >= mark && !state.celebrated.includes(mark));
  whoosh();
  setTimeout(() => burst(hit ? 220 : 60), 900);
  if (!hit) return;
  state.celebrated = [...state.celebrated, hit];
  saveLocal(state);
  setTimeout(() => fanfare(hit === 100), 900);
  if (hit === 100) setTimeout(() => { $('#overlay-prize').textContent = state.prize || 'Vælg præmien'; $('#overlay').hidden = false; $('#celebrate').focus(); burst(320); }, 900);
}
function flyer(text) {
  const rocket = $('.rocket'); if (!rocket) return;
  clearTimeout(flyerTimer);
  rocket.querySelector('.flyer')?.remove();
  rocket.prepend(el('div', { class: 'flyer' }, text));
  flyerTimer = setTimeout(() => rocket.querySelector('.flyer')?.remove(), 1800);
}

/* ---------- forsiden ---------- */
const ROCKET = `<svg viewBox="0 0 110 76" role="img" aria-label="Raket"><defs><linearGradient id="hull" x2="0" y2="1"><stop stop-color="#fff"/><stop offset=".55" stop-color="#EAF0FF"/><stop offset="1" stop-color="#C2CDEE"/></linearGradient><linearGradient id="nose" x2="0" y2="1"><stop stop-color="#FF8E53"/><stop offset="1" stop-color="#E8531C"/></linearGradient></defs><g class="flame"><path d="M17 30C6 25-7 29-16 38C-7 47 6 51 17 46C14 44 13 41 13 38C13 35 14 32 17 30Z" fill="#FFC94D"/><path d="M16 33C9 31 1 33-5 38C1 43 9 45 16 43C14 41 14 40 14 38C14 36 15 35 16 33Z" fill="#FF6B35"/></g><path d="M36 21C31 11 23 5 12 4C17 12 19 18 19 25L36 27Z" fill="url(#nose)"/><path d="M36 55C31 65 23 71 12 72C17 64 19 58 19 51L36 49Z" fill="url(#nose)"/><path d="M25 29L17 31V45L25 47Z" fill="#8E9BC4"/><path d="M31 17C27 17 24 22 24 29V47C24 54 27 59 31 59H46C66 59 85 50 97 38C85 26 66 17 46 17Z" fill="url(#hull)"/><path d="M64 19.5C78 23 90 30 97 38C90 46 78 53 64 56.5C70 50 72 44.5 72 38S70 26 64 19.5Z" fill="url(#nose)"/><circle cx="47" cy="38" r="10" fill="#8E9BC4"/><circle cx="47" cy="38" r="7.5" fill="#5FA8E8"/><circle cx="44.5" cy="35.5" r="2.6" fill="#D8ECFF"/><rect x="30" y="20.5" width="4.5" height="35" rx="2" fill="#FF6B35"/></svg>`;

function pace() {
  const start = new Date(`${CHALLENGE.start}T00:00:00`), end = new Date(`${CHALLENGE.end}T00:00:00`), stamp = new Date();
  const share = Math.min(Math.max((stamp - start) / (end - start), 0), 1);
  const days = Math.round((end - start) / 864e5);
  return {
    diff: Math.round(total() - GOAL * share),
    day: Math.max(1, Math.min(days, Math.floor((stamp - start) / 864e5) + 1)),
    days,
    daily: Math.max(0, Math.ceil((GOAL - total()) / Math.max(1, Math.round((end - stamp) / 864e5))))
  };
}
function heroSection() {
  return el('section', { class: 'hero' }, [
    // Tælleren tæller op billede for billede, så den må ikke være et live-område —
    // en skærmlæser ville læse hvert eneste mellemtal højt.
    el('div', { class: 'total', id: 'hero-total', 'aria-hidden': 'true' }, fmt(displayTotal)),
    el('div', { class: 'sub', id: 'hero-sub' }, ''),
    el('div', { class: 'chips', id: 'hero-chips' }),
    el('div', { class: 'empty-note', id: 'hero-empty', hidden: 'hidden' }, 'Endnu ingen bøger i loggen — tast den første og send raketten afsted.')
  ]);
}
function trackSection() {
  const track = el('div', { class: 'track' }, [
    el('div', { class: 'dash' }),
    el('div', { class: 'fill' }),
    el('div', { class: 'start' }, [el('i'), 'Start', el('br'), '1. aug 2026']),
    ...[25, 50, 75].map(mark => el('div', { class: 'mark', 'data-mark': mark, style: `left:calc(70px + (100% - 156px) * ${mark / 100})` }, [el('i'), fmt(GOAL * mark / 100), el('small', {}, `${mark} %`)])),
    el('div', { class: 'planet-wrap' }, [
      el('div', { class: 'planet' }, el('i', { class: 'flag' })),
      el('div', { class: 'prize-label' }, 'PRÆMIEN'),
      button(state.prize || 'Vælg præmien', openPrize, 'prize')
    ]),
    el('div', { class: 'rocket' })
  ]);
  track.querySelector('.rocket').insertAdjacentHTML('beforeend', ROCKET);
  return track;
}
function refreshHero() {
  const pages = total(), share = Math.min(pages / GOAL, 1), { diff, day, days, daily } = pace();
  $('#hero-total').textContent = fmt(displayTotal);
  $('#hero-sub').textContent = `${fmt(pages)} af ${fmt(GOAL)} sider · ${(share * 100).toLocaleString('da-DK', { maximumFractionDigits: 1 })} % af målet`;
  $('#hero-chips').replaceChildren(
    el('span', { class: `chip ${diff >= 0 ? 'good' : 'behind'}` }, `${fmt(Math.abs(diff))} sider ${diff >= 0 ? 'foran' : 'efter'} planen`),
    el('span', { class: 'chip' }, `Dag ${day} af ${days}`),
    el('span', { class: 'chip' }, `≈ ${fmt(daily)} sider om dagen herfra`)
  );
  $('#hero-empty').hidden = books().length > 0;
  $('.fill').style.width = `calc((100% - 156px) * ${share})`;
  $('.rocket').style.left = `calc(70px + (100% - 156px) * ${share})`;
  for (const mark of document.querySelectorAll('.mark')) mark.classList.toggle('done', share * 100 >= Number(mark.dataset.mark));
  $('#remaining').textContent = pages < GOAL ? `${fmt(GOAL - pages)} sider tilbage til præmien` : 'Målet er nået — præmien er jeres!';
  $('.prize').textContent = state.prize || 'Vælg præmien';
}
function refreshPeople() {
  $('#people').replaceChildren(...READERS.map(reader => {
    const own = books().filter(book => book.reader === reader.id);
    const pages = own.reduce((sum, book) => sum + book.pages, 0);
    const badges = [['🚀', 'Første bog', own.length >= 1], ['📚', '5 bøger', own.length >= 5], ['🌙', '1.000 sider', pages >= 1000], ['⭐', '2.500 sider', pages >= 2500], ['🐘', 'En bog på 300+ sider', own.some(book => book.pages >= 300)], ['🏆', 'Personligt mål nået', pages >= PERSON_GOAL]];
    return el('article', { class: 'card person' }, [
      el('div', { class: 'identity' }, [
        el('div', { class: 'avatar', style: `background:${reader.color}`, 'aria-hidden': 'true' }, reader.name[0]),
        el('div', {}, [el('h2', { class: 'name' }, reader.name), el('div', { class: 'meta' }, `${own.length} ${own.length === 1 ? 'bog' : 'bøger'}`)])
      ]),
      el('div', { class: 'pages' }, [fmt(pages), ' ', el('span', {}, `/ ${fmt(PERSON_GOAL)} sider`)]),
      el('div', { class: 'bar' }, el('i', { style: `width:${Math.min(100, pages / PERSON_GOAL * 100)}%;background:${reader.color};box-shadow:0 0 10px ${reader.color}66` })),
      el('div', { class: 'badges' }, badges.map(([emoji, title, earned]) => el('span', { class: `badge ${earned ? '' : 'locked'}`, role: 'img', title, 'aria-label': `${title}: ${earned ? 'opnået' : 'endnu ikke opnået'}` }, emoji)))
    ]);
  }));
}

/* ---------- tilføj-formularen ---------- */
function addForm() {
  const card = el('article', { class: 'card' }, [el('h2', {}, 'Ny bog læst?'), el('p', { class: 'hint' }, 'Siderne skubber raketten mod præmien.'), el('div', { class: 'label' }, 'HVEM HAR LÆST DEN?')]);
  const readers = el('div', { class: 'readers' });
  const paint = () => [...readers.children].forEach(chip => {
    const reader = readerOf(chip.dataset.reader), active = draft.reader === reader.id;
    chip.style.cssText = active ? `background:${reader.color};color:#0B1026;border-color:${reader.color}` : '';
    chip.querySelector('i').style.background = active ? '#0B1026' : reader.color;
    chip.setAttribute('aria-pressed', active);
  });
  READERS.forEach(reader => {
    const chip = button([el('i'), reader.name], () => { draft.reader = reader.id; paint(); toggleSubmit(); }, 'reader');
    chip.dataset.reader = reader.id;
    readers.append(chip);
  });
  const form = el('form', { id: 'add-form', novalidate: 'novalidate' });
  form.innerHTML = `<div class="form-grid">
    <div class="full"><label for="add-title">Titel</label><input id="add-title" name="title" maxlength="160" required placeholder="Fx Mumitroldene og den store oversvømmelse"></div>
    <div><label for="add-author">Forfatter <small>(valgfri)</small></label><input id="add-author" name="author" maxlength="120" placeholder="Tove Jansson"></div>
    <div><label for="add-pages">Sidetal</label><input id="add-pages" name="pages" type="number" min="1" max="10000" required placeholder="180"></div>
    <div><label for="add-date">Færdig den</label><input id="add-date" name="date" type="date" required></div>
    <div class="full"><label id="add-emoji-label">Hvad synes du?</label><div class="reactions" role="group" aria-labelledby="add-emoji-label"></div></div>
    <div class="full"><label for="add-comment">Kommentar <small>(valgfri)</small></label><input id="add-comment" name="comment" maxlength="500" placeholder="Den bedste bog i år!"></div>
  </div>`;
  form.elements.date.value = today();
  const reactions = form.querySelector('.reactions');
  const paintEmojis = () => reactions.replaceChildren(...EMOJIS.map(emoji => {
    const chip = button(emoji, () => { draft.emoji = emoji; paintEmojis(); }, `reaction ${emoji === draft.emoji ? 'active' : ''}`);
    chip.setAttribute('aria-label', `Vælg reaktionen ${emoji}`); chip.setAttribute('aria-pressed', emoji === draft.emoji);
    return chip;
  }));
  const submit = el('button', { class: 'submit', disabled: 'disabled' }, 'Send siderne afsted');
  const toggleSubmit = () => { submit.disabled = !(form.elements.title.value.trim() && draft.reader && Number(form.elements.pages.value) > 0); };
  form.append(submit);
  form.addEventListener('input', toggleSubmit);
  form.addEventListener('submit', event => { event.preventDefault(); addBook(form, toggleSubmit); });
  paint(); paintEmojis();
  card.append(readers, form);
  return card;
}
function addBook(form, toggleSubmit) {
  const fields = { ...Object.fromEntries(new FormData(form)), reader: draft.reader, emoji: draft.emoji };
  const book = createBook(fields);
  if (!validBook(book)) return announce('Bogen mangler titel, læser eller et gyldigt sidetal.');
  const before = total();
  save(operation(book), `“${book.title}” er tilføjet.`);
  flyer(`+${fmt(book.pages)} sider`);
  celebrate(before, before + book.pages);
  form.reset(); form.elements.date.value = today(); draft.emoji = EMOJIS[0];
  form.querySelectorAll('.reaction').forEach((chip, index) => chip.classList.toggle('active', index === 0));
  toggleSubmit(); form.elements.title.focus();
}

/* ---------- logbogen ---------- */
function logCard() {
  const card = el('article', { class: 'card' }, el('div', { class: 'log-head' }, [el('h2', {}, 'Logbog'), el('span', { class: 'meta', id: 'log-count' })]));
  const controls = el('div', { class: 'filters' });
  controls.innerHTML = `<label>Søg <input id="search" type="search" placeholder="Titel eller forfatter"></label>
    <label>Læser <select id="reader-filter"><option value="">Alle</option></select></label>
    <label>Måned <input id="month-filter" type="month"></label>
    <label>Reaktion <select id="emoji-filter"><option value="">Alle</option></select></label>
    <label>Sortér <select id="sort"><option value="date">Dato</option><option value="pages">Sidetal</option><option value="title">Titel</option></select></label>`;
  READERS.forEach(reader => controls.querySelector('#reader-filter').append(new Option(reader.name, reader.id)));
  EMOJIS.forEach(emoji => controls.querySelector('#emoji-filter').append(new Option(emoji, emoji)));
  controls.addEventListener('input', () => {
    Object.assign(filters, { search: controls.querySelector('#search').value, reader: controls.querySelector('#reader-filter').value, month: controls.querySelector('#month-filter').value, emoji: controls.querySelector('#emoji-filter').value, sort: controls.querySelector('#sort').value });
    refreshLog();
  });
  card.append(controls, el('div', { class: 'log', id: 'book-log' }));
  return card;
}
function filtered() {
  const query = filters.search.toLocaleLowerCase('da');
  return books()
    .filter(book => (!query || `${book.title} ${book.author}`.toLocaleLowerCase('da').includes(query)) && (!filters.reader || book.reader === filters.reader) && (!filters.month || book.date.startsWith(filters.month)) && (!filters.emoji || book.emoji === filters.emoji))
    .sort(filters.sort === 'title' ? (a, b) => a.title.localeCompare(b.title, 'da') : filters.sort === 'pages' ? (a, b) => b.pages - a.pages : (a, b) => b.date.localeCompare(a.date));
}
function refreshLog() {
  const log = $('#book-log'); if (!log) return;
  const shown = filtered();
  $('#log-count').textContent = `${books().length} ${books().length === 1 ? 'bog' : 'bøger'} · ${fmt(total())} sider`;
  log.replaceChildren();
  if (!books().length) return log.append(el('p', { class: 'hint' }, 'Her lander bøgerne, når I taster dem ind. Den første venter på jer.'));
  if (!shown.length) return log.append(el('p', { class: 'hint' }, 'Ingen bøger matcher filtrene.'));
  let month = '';
  for (const book of shown) {
    if (filters.sort === 'date' && book.date.slice(0, 7) !== month) {
      month = book.date.slice(0, 7);
      log.append(el('h3', { class: 'month-heading' }, new Date(`${month}-01T12:00:00`).toLocaleDateString('da-DK', { month: 'long', year: 'numeric' })));
    }
    const reader = readerOf(book.reader);
    const emoji = button(book.emoji, () => openDetail(book), 'book-emoji');
    emoji.setAttribute('aria-label', `Vis detaljer om ${book.title}`);
    log.append(el('article', { class: 'book' }, [
      emoji,
      el('div', { class: 'book-main' }, [
        el('div', { class: 'book-title' }, [book.title, book.author ? el('span', { class: 'byline' }, ` · ${book.author}`) : null]),
        el('div', {}, [
          el('span', { class: 'reader-chip', style: `background:${reader.color}22;color:${reader.color}` }, reader.name),
          el('span', { class: 'date' }, new Date(`${book.date}T12:00:00`).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }))
        ]),
        book.comment ? el('div', { class: 'comment' }, `“${book.comment}”`) : null
      ]),
      el('div', { class: 'book-side' }, `+${fmt(book.pages)}`),
      button('Redigér', () => openEditor(book), 'secondary'),
      button('Slet', () => trash(book), 'danger')
    ]));
  }
}

/* ---------- dialoger ---------- */
function openEditor(book) {
  lastFocus = document.activeElement;
  const form = $('#book-form');
  form.reset();
  form.elements.id.value = book.id; form.elements.title.value = book.title; form.elements.author.value = book.author;
  form.elements.pages.value = book.pages; form.elements.date.value = book.date; form.elements.reader.value = book.reader;
  form.elements.comment.value = book.comment;
  editingEmoji = book.emoji;
  renderEmojis();
  $('#book-dialog').showModal();
  form.elements.title.focus();
}
function renderEmojis() {
  $('#emojis').replaceChildren(...EMOJIS.map(emoji => {
    const chip = button(emoji, () => { editingEmoji = emoji; renderEmojis(); }, `reaction ${emoji === editingEmoji ? 'active' : ''}`);
    chip.setAttribute('aria-label', `Vælg reaktionen ${emoji}`); chip.setAttribute('aria-pressed', emoji === editingEmoji);
    return chip;
  }));
}
$('#book-form').addEventListener('submit', event => {
  if (event.submitter?.value !== 'save') return;
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const old = state.books.find(book => book.id === form.elements.id.value);
  if (!old) return;
  const fields = { ...Object.fromEntries(new FormData(form)), emoji: editingEmoji };
  const book = { ...createBook(fields, old.createdAt, old.id), createdAt: old.createdAt, updatedAt: now(), deletedAt: old.deletedAt ?? null };
  if (!validBook(book)) return announce('Bogen kunne ikke gemmes — tjek titel, sidetal og læser.');
  save(operation(book), 'Bogen er opdateret.');
  $('#book-dialog').close();
  lastFocus?.focus();
});
function openDetail(book) {
  lastFocus = document.activeElement;
  const reader = readerOf(book.reader);
  $('#detail-content').replaceChildren(
    el('h2', { id: 'detail-title' }, book.title),
    el('p', {}, `${book.emoji} ${book.author || 'Ukendt forfatter'}`),
    el('p', {}, `${fmt(book.pages)} sider · ${reader.name} · ${new Date(`${book.date}T12:00:00`).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })}`),
    el('p', {}, book.comment || 'Ingen kommentar')
  );
  $('#detail-dialog').showModal();
}
function openPrize() {
  lastFocus = document.activeElement;
  $('#prize-input').value = state.prize;
  $('#prize-dialog').showModal();
  $('#prize-input').focus();
}
$('#prize-form').addEventListener('submit', event => {
  if (event.submitter?.value !== 'save') return;
  event.preventDefault();
  save({ operationId: uuid(), type: 'settings', createdAt: now(), updatedAt: now(), prize: $('#prize-input').value.trim().slice(0, 200) }, 'Præmien er gemt.');
  $('#prize-dialog').close();
  lastFocus?.focus();
});
function trash(book) {
  const deleted = { ...book, deletedAt: now(), updatedAt: now() };
  save(operation(deleted), `“${book.title}” er flyttet til papirkurven.`);
  $('#notice').append(' ', button('Fortryd sletning', () => restore(deleted), 'undo'));
}
function restore(book) { save(operation({ ...book, deletedAt: null, updatedAt: now() }), `“${book.title}” er gendannet.`); }

/* ---------- statistik og data ---------- */
function refreshStats() {
  const totals = READERS.map(reader => [reader, books().filter(book => book.reader === reader.id).reduce((sum, book) => sum + book.pages, 0)]);
  const max = Math.max(1, ...totals.map(([, pages]) => pages));
  const biggest = [...books()].sort((a, b) => b.pages - a.pages)[0];
  const top = [...totals].sort((a, b) => b[1] - a[1])[0];
  const months = ['Aug', 'Sep', 'Okt', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul'].map((label, index) => {
    const year = Number(CHALLENGE.start.slice(0, 4)) + (index < 5 ? 0 : 1), month = String((7 + index) % 12 + 1).padStart(2, '0');
    return [label, books().filter(book => book.date.startsWith(`${year}-${month}`)).reduce((sum, book) => sum + book.pages, 0)];
  });
  const maxMonth = Math.max(1, ...months.map(([, pages]) => pages));
  const facts = [['Bøger i alt', String(books().length)], ['Sider i alt', fmt(total())], ['Snit pr. bog', books().length ? `${fmt(total() / books().length)} sider` : '—'], ['Tykkeste bog', biggest ? `${biggest.title} · ${fmt(biggest.pages)} sider` : '—'], ['Flittigste læser', top[1] ? `${top[0].name} · ${fmt(top[1])} sider` : '—']];
  $('#stats').replaceChildren(el('div', { class: 'stats-grid' }, [
    el('article', { class: 'card' }, [el('h2', {}, 'Sider pr. person'), ...totals.map(([reader, pages]) => el('div', { class: 'stat-row' }, [
      el('b', {}, reader.name),
      el('div', { class: 'bar' }, el('i', { style: `width:${pages / max * 100}%;background:${reader.color}` })),
      el('output', {}, fmt(pages))
    ]))]),
    el('article', { class: 'card' }, [el('h2', {}, 'Nøgletal'), ...facts.map(([label, value]) => el('div', { class: 'fact' }, [el('span', {}, label), el('b', {}, value)]))]),
    el('article', { class: 'card wide' }, [el('h2', {}, 'Sider pr. måned'), el('div', { class: 'months' }, months.map(([label, pages]) => el('div', { class: 'month' }, [
      el('output', {}, pages ? fmt(pages) : ''),
      el('i', { style: `height:${pages ? Math.max(8, pages / maxMonth * 130) : 3}px;${pages ? '' : 'background:rgba(255,255,255,.08)'}` }),
      el('span', {}, label)
    ])))])
  ]));
}
function refreshAdmin() {
  const root = $('#admin');
  root.replaceChildren(
    el('h2', {}, 'Data, backup og papirkurv'),
    el('p', {}, 'Alle ændringer gemmes som append-only operationer og daglige snapshots på serveren. Slettede bøger opbevares i mindst 30 dage.'),
    button('Eksportér JSON', exportJson, 'secondary'),
    button('Eksportér CSV', exportCsv, 'secondary')
  );
  const input = el('input', { type: 'file', accept: 'application/json' });
  input.addEventListener('change', importJson);
  root.append(el('label', { class: 'import' }, ['Importér JSON (forhåndsvises først) ', input]), el('h3', {}, 'Papirkurv'));
  const deleted = state.books.filter(book => book.deletedAt);
  if (!deleted.length) return root.append(el('p', { class: 'hint' }, 'Papirkurven er tom.'));
  deleted.forEach(book => root.append(el('div', { class: 'trash-row' }, [el('span', {}, `${book.title} · slettet ${book.deletedAt.slice(0, 10)}`), button('Gendan', () => restore(book), 'secondary')])));
}
function download(name, content, type) { const link = el('a', { download: name, href: URL.createObjectURL(new Blob([content], { type })) }); link.click(); URL.revokeObjectURL(link.href); }
function exportJson() { download('laeseraket-backup.json', JSON.stringify(state, null, 2), 'application/json'); }
function exportCsv() {
  const quote = value => `"${String(value).replaceAll('"', '""')}"`;
  download('laeseraket.csv', ['Titel,Forfatter,Sider,Læser,Dato,Reaktion,Kommentar', ...books().map(book => [book.title, book.author, book.pages, book.reader, book.date, book.emoji, book.comment].map(quote).join(','))].join('\n'), 'text/csv');
}
async function importJson(event) {
  try {
    const candidate = JSON.parse(await event.target.files[0].text());
    const all = Array.isArray(candidate.books) ? candidate.books : [];
    const valid = all.filter(validBook);
    if (!confirm(`Importen indeholder ${all.length} bogposter, hvoraf ${valid.length} er gyldige. Sammenflet efter ID?`)) return;
    for (const book of valid) save(operation(book), 'Importerer…');
    announce('Importen er valideret og gennemført.');
  } catch { announce('Importen kunne ikke læses eller valideres.'); }
}

/* ---------- opstart ---------- */
function render() { refreshHero(); refreshPeople(); refreshLog(); refreshStats(); refreshAdmin(); $('#mute').textContent = state.muted ? '🔇' : '🔊'; $('#mute').setAttribute('aria-label', state.muted ? 'Slå lyd til' : 'Slå lyd fra'); }
function buildHome() {
  $('#home').replaceChildren(heroSection(), trackSection(), el('div', { class: 'remaining', id: 'remaining' }), el('div', { class: 'people', id: 'people' }), el('div', { class: 'bottom' }, [addForm(), logCard()]));
}

document.querySelectorAll('[data-close]').forEach(node => node.addEventListener('click', () => { node.closest('dialog').close(); lastFocus?.focus(); }));
document.querySelectorAll('dialog').forEach(node => node.addEventListener('cancel', () => lastFocus?.focus()));
READERS.forEach(reader => $('#book-form').elements.reader.append(new Option(reader.name, reader.id)));
document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => document.querySelectorAll('.tab').forEach(other => {
  const active = other === tab;
  other.classList.toggle('active', active);
  other.setAttribute('aria-selected', active);
  $(`#${other.dataset.view}`).hidden = !active;
})));
$('#mute').addEventListener('click', () => { state.muted = !state.muted; saveLocal(state); render(); });
$('#overlay').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.hidden = true; });
$('#celebrate').addEventListener('click', () => { $('#overlay').hidden = true; });
addEventListener('resize', sizeCanvas);
addEventListener('online', sync);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');

sizeCanvas();
buildHome();
render();
animate(0, total());
sync();
