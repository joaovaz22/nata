'use strict';

/* =========================================================
   Settings you may want to tweak
   ========================================================= */
const STORAGE_KEY = 'nata-v1';
const PREFS_KEY = 'nata-prefs';   // sound + theme only; your data stays in nata-v1
const DAY_START_HOUR = 5;         // the day "resets" at 05:00
const DEFAULT_GOAL = 2000;
const CELEBRATE_WITHIN = 0.05;    // big celebration when you land within ±5% of the goal

// Starter ingredient base: [name, emoji, unit, kcal]
// unit 'g' / 'ml' -> kcal per 100 g / 100 ml ; unit 'un' -> kcal per unit
const SEED_INGREDIENTS = [
  ['Egg', '🥚', 'un', 72],
  ['Bread', '🍞', 'g', 265],
  ['Oats', '🌾', 'g', 389],
  ['Milk (semi-skimmed)', '🥛', 'ml', 47],
  ['Greek yogurt (plain)', '🥣', 'g', 97],
  ['Cheese (sliced)', '🧀', 'g', 356],
  ['Butter', '🧈', 'g', 717],
  ['Olive oil', '🫒', 'g', 884],
  ['Rice (cooked)', '🍚', 'g', 130],
  ['Pasta (cooked)', '🍝', 'g', 158],
  ['Potato (boiled)', '🥔', 'g', 87],
  ['Sweet potato', '🍠', 'g', 86],
  ['Chicken breast (cooked)', '🍗', 'g', 165],
  ['Minced beef (cooked)', '🥩', 'g', 250],
  ['Salmon', '🐟', 'g', 208],
  ['Tuna (canned, in water)', '🐟', 'g', 116],
  ['Chickpeas (cooked)', '🫘', 'g', 164],
  ['Beans (cooked)', '🫘', 'g', 127],
  ['Broccoli', '🥦', 'g', 34],
  ['Tomato', '🍅', 'g', 18],
  ['Lettuce', '🥬', 'g', 15],
  ['Carrot', '🥕', 'g', 41],
  ['Avocado', '🥑', 'g', 160],
  ['Banana', '🍌', 'g', 89],
  ['Apple', '🍎', 'g', 52],
  ['Peanut butter', '🥜', 'g', 588],
  ['Almonds', '🌰', 'g', 579],
  ['Honey', '🍯', 'g', 304],
  ['Dark chocolate', '🍫', 'g', 546],
  ['Pastel de nata', '🥧', 'un', 290],
];

// What Lula says to you. Edit freely! (bucket -> Lula mood is in MOOD_OF below)
const QUIPS = {
  empty: [
    'Blank slate. The fridge is watching you. 👀',
    'Nothing yet. Your stomach has filed a formal complaint. 📝',
    'A fresh day, a fresh plate. Let\'s go! 🌅',
    'Lula\'s tummy is rumbling in Morse code. 📡',
    'Six arms and zero snacks. Send help. 🦑',
  ],
  low: [
    'Light start. Plenty of room for greatness. 🚀',
    'Barely touched the budget. Snack responsibly (or don\'t). 😏',
    'You\'re basically running on vibes right now. ✨',
    'Lula is doing happy wiggles. Keep it light! 🫧',
    'Barely a nibble. An ocean of options awaits. 🌊',
  ],
  mid: [
    'Cruising nicely. Pilot to tower: all good. ✈️',
    'Halfway-ish. Balanced, as all things should be. ⚖️',
    'Steady pace. Your future self is nodding approvingly. 👍',
    'Smooth sailing. Lula is humming sea shanties. 🎶',
    'Perfectly balanced, like a squid on a skateboard. 🛹',
  ],
  high: [
    'Getting close. Choose your next bite like a chess move. ♟️',
    'Final stretch! Make it something tasty. 🏁',
    'The budget is thin but the spirit is strong. 💪',
    'Lula is sweating ink. Choose wisely. 💧',
    'A tiny snack fits. A whale does not. 🐋',
  ],
  done: [
    'Nailed it. Right on target. 🎯',
    'Landing the plane. Smooth. 🛬',
    'Budget complete. Kitchen is now closed (allegedly). 🔒',
    'Bullseye! Lula is doing victory spins. 🌀',
    'Target hit. Fish confetti deployed. 🐟',
  ],
  over: [
    'A little over. Tomorrow-you says it\'s fine. 🤷',
    'Slight overshoot. We\'ll call it "bonus fuel". ⛽',
    'Over, but who\'s counting? Oh right, me. 😅',
    'Lula said "oops" in ink. It washes off. 🫧',
    'A splash over. Totally squid-vivable. 🦑',
  ],
  way: [
    'Whoops. Let\'s call today a "bulking" day. 🏋️',
    'The budget has left the chat. 📉 Fresh start at 5 am!',
    'Legendary feast. Tomorrow is a new day. 🌄',
    'Lula has puffed up in solidarity. 🎈',
    'Ink cloud deployed. Nobody saw anything. 🌫️',
  ],
  night: [
    'Shh… Lula is asleep. The day resets at 5 am. 🌙',
    'Midnight snack? Lula is dreaming about it too. 💤',
    'Night shift. The fridge light is very bright. 🔦',
  ],
  logged: [
    'Logged! 🎉', 'Nom nom, noted. 📝', 'Into the books it goes! 📚',
    'Delicious data saved. 🤓', 'Fuel acquired. ⛽', 'Bon appétit! 🥖',
  ],
};
const MOOD_OF = { empty: 'hungry', low: 'light', mid: 'cruising', high: 'careful', done: 'target', over: 'over', way: 'way', night: 'night' };

/* =========================================================
   Helpers
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const fmt = (n) => Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');
const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const rand = (a, b) => a + Math.random() * (b - a);
const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const sfx = (n) => window.Lula && Lula.sfx.play(n);

function dayKey(d = new Date()) {
  const x = new Date(d.getTime() - DAY_START_HOUR * 3600e3);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
}
function dayLabel(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
function itemKcal(it) {
  const q = num(it.qty);
  if (it.unit === 'kcal') return q;
  if (it.unit === 'un') return it.per * q;
  return (it.per * q) / 100;
}
const sumKcal = (items) => items.reduce((a, it) => a + itemKcal(it), 0);
const unitShort = (u) => (u === 'un' ? '×' : u === 'kcal' ? 'kcal' : u);
const perText = (u, per) => (u === 'un' ? `${fmt(per)} kcal each` : u === 'kcal' ? 'calories only' : `${fmt(per)} kcal / 100 ${u}`);

// Count a number from -> to, calling draw(value) each frame (text only, no layout work)
function roll(el, from, to, draw, dur = 800) {
  cancelAnimationFrame(el._raf);
  if (from === to) { draw(to); return; }
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    draw(from + (to - from) * e);
    if (k < 1) el._raf = requestAnimationFrame(step);
  };
  el._raf = requestAnimationFrame(step);
}
function bump(el, s = 1.08) {
  if (!el || reduced()) return;
  el.animate([{ transform: 'scale(1)' }, { transform: `scale(${s})` }, { transform: 'scale(1)' }], { duration: 260, easing: 'ease-out' });
}

/* =========================================================
   State (saved on the phone in localStorage)
   ========================================================= */
function seedState() {
  const ingredients = SEED_INGREDIENTS.map(([name, emoji, unit, per]) => ({ id: uid(), name, emoji, unit, per, used: 0 }));
  const byName = (n) => ingredients.find((i) => i.name === n);
  const mk = (name, emoji, list) => ({
    id: uid(), name, emoji,
    items: list.map(([n, qty]) => { const i = byName(n); return { ingId: i.id, name: i.name, emoji: i.emoji, unit: i.unit, per: i.per, qty }; }),
  });
  return {
    v: 1,
    goal: DEFAULT_GOAL,
    ingredients,
    meals: [
      mk('Morning oats', '🥣', [['Oats', 50], ['Milk (semi-skimmed)', 200], ['Banana', 100]]),
      mk('Chicken & rice', '🍗', [['Chicken breast (cooked)', 150], ['Rice (cooked)', 180], ['Broccoli', 100], ['Olive oil', 5]]),
    ],
    log: {},
  };
}
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (s && Array.isArray(s.ingredients)) return s;
  } catch { /* fall through */ }
  return seedState();
}
let S = loadState();
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); }
  catch { toast('⚠️ Could not save — storage full?'); }
}
save();
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});

let P = (() => { try { return { sound: false, theme: 'auto', ...JSON.parse(localStorage.getItem(PREFS_KEY)) }; } catch { return { sound: false, theme: 'auto' }; } })();
function savePrefs() { try { localStorage.setItem(PREFS_KEY, JSON.stringify(P)); } catch { /* optional */ } }
function applyPrefs() {
  if (window.Lula) Lula.sfx.enabled = !!P.sound;
  const root = document.documentElement;
  if (P.theme === 'auto') root.removeAttribute('data-theme'); else root.dataset.theme = P.theme;
  const dark = P.theme === 'dark' || (P.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('#theme-color')?.setAttribute('content', dark ? '#071A30' : '#E6F7FF');
}
applyPrefs();
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyPrefs);

const todayEntries = () => S.log[dayKey()] || [];
const eatenOn = (key) => (S.log[key] || []).reduce((a, e) => a + e.kcal, 0);
const ingById = (id) => S.ingredients.find((i) => i.id === id);
const mealById = (id) => S.meals.find((m) => m.id === id);
const sortedIngredients = () => [...S.ingredients].sort((a, b) => (b.used || 0) - (a.used || 0) || a.name.localeCompare(b.name));

/* =========================================================
   UI plumbing
   ========================================================= */
let tab = 'today';
let currentDay = dayKey();

function render(opts) {
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  document.body.dataset.tab = tab;
  const view = $('#view');
  if (tab === 'today') return renderToday(opts);
  view.innerHTML = { meals: viewMeals, ingredients: viewIngredients, more: viewMore }[tab]();
  stagger(view);
}
function stagger(root) {
  let i = 0;
  root.querySelectorAll(':scope > *, :scope > .card > *, :scope > #ing-list > .card > *').forEach((el) => {
    if (el.classList.contains('card')) return;
    el.classList.add('rise-in'); el.style.setProperty('--i', Math.min(i++, 14));
  });
}

let miniLula = null;
function destroyMini() { if (miniLula) { miniLula.destroy(); miniLula = null; } }
function openSheet(n, html) {
  const el = $('#sheet' + n);
  if (n === 1) destroyMini();
  const wasOpen = el.classList.contains('open');
  el.innerHTML = html;
  el.classList.add('open');
  el.querySelector('.sheet-body')?.scrollTo(0, 0);
  if (!wasOpen) sfx('pop');
}
function closeSheet(n) {
  $('#sheet' + n).classList.remove('open');
  if (n === 1) setTimeout(() => { if (!$('#sheet1').classList.contains('open')) destroyMini(); }, 450);
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  $('.tmsg', t).textContent = msg;
  if (t.classList.contains('show')) bump(t, 1.05);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// Full-screen confetti of bubbles, fish and stars
function confetti(n = 26) {
  const items = ['🐟', '⭐', '🐠', '✨', '🐡', '⭐'];
  const W = innerWidth, H = innerHeight, calm = reduced();
  for (let i = 0; i < n; i++) {
    const el = document.createElement('span');
    const bub = i % 3 === 2;
    el.className = 'fx' + (bub ? ' bub' : '');
    if (bub) { const s = rand(12, 26); el.style.width = el.style.height = s + 'px'; } else el.textContent = items[i % items.length];
    document.body.appendChild(el);
    const x = rand(0, W), sway = rand(-60, 60), r = rand(-360, 360);
    const kf = calm
      ? [{ transform: `translate(${x}px,${rand(H * 0.1, H * 0.6)}px)`, opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }]
      : [{ transform: `translate(${x}px,-40px) rotate(0deg)` }, { transform: `translate(${x + sway}px,${H * 0.5}px) rotate(${r / 2}deg)`, offset: 0.5 }, { transform: `translate(${x - sway / 2}px,${H + 40}px) rotate(${r}deg)`, opacity: 0.7 }];
    const a = el.animate(kf, { duration: rand(1800, 2800), delay: rand(0, 400), easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'both' });
    a.onfinish = () => el.remove();
  }
}
// Small cloud puff (edit / delete)
function poof(target) {
  const r = (target || $('.lula-host') || document.body).getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + Math.min(r.height / 2, innerHeight / 2);
  for (let i = 0; i < 8; i++) {
    const el = document.createElement('span');
    el.className = 'fx poof';
    document.body.appendChild(el);
    const a = (i / 8) * Math.PI * 2, d = rand(30, 52);
    const kf = reduced()
      ? [{ transform: `translate(${cx}px,${cy}px)`, opacity: 0 }, { opacity: 0.9, offset: 0.3 }, { opacity: 0 }]
      : [{ transform: `translate(${cx - 11}px,${cy - 11}px) scale(.3)`, opacity: 1 }, { transform: `translate(${cx - 11 + Math.cos(a) * d}px,${cy - 11 + Math.sin(a) * d}px) scale(1.3)`, opacity: 0 }];
    el.animate(kf, { duration: 600, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' }).onfinish = () => el.remove();
  }
  sfx('pfft');
}

/* =========================================================
   Today
   ========================================================= */
function bucketFor(eaten, goal, count) {
  if (new Date().getHours() < DAY_START_HOUR) return 'night';
  const p = eaten / goal;
  return count === 0 ? 'empty' : p < 0.3 ? 'low' : p < 0.7 ? 'mid' : p < 0.95 ? 'high' : p <= 1.0 ? 'done' : p <= 1.15 ? 'over' : 'way';
}
function quipFor(eaten, goal, count) { return pick(QUIPS[bucketFor(eaten, goal, count)], hash(dayKey() + count)); }
function ringColor(p) { return p <= 0.7 ? 'var(--good)' : p <= 1 ? 'var(--warn)' : 'var(--bad)'; }

const RING_R = 106, RING_C = 2 * Math.PI * RING_R;
let lula = null, lulaHost = null, shownLeft = null, shownEaten = null, listIds = null;

function ensureLula(mood) {
  if (!lulaHost) { lulaHost = document.createElement('div'); lulaHost.className = 'lula-host'; }
  if (!lula && window.Lula) lula = Lula.create(lulaHost, { mood: mood || 'cruising' });
  return lula;
}

function todaySkeleton() {
  return `
  <section id="today">
    <h1>Today</h1>
    <p class="sub" id="t-date"></p>
    <div class="hero">
      <div class="say" id="t-quip"></div>
      <div class="ring">
        <svg class="ring-svg" viewBox="0 0 240 240" aria-hidden="true">
          <circle class="track" cx="120" cy="120" r="${RING_R}"/>
          <circle class="bar" id="t-bar" cx="120" cy="120" r="${RING_R}" stroke-dasharray="${RING_C}" stroke-dashoffset="${RING_C}"/>
          <circle class="suckers" cx="120" cy="120" r="${RING_R}" stroke-dasharray="0 ${RING_C / 30}"/>
        </svg>
        <div class="lula-slot" id="lula-slot"></div>
      </div>
      <div class="num-wrap" id="t-numwrap" aria-live="polite"><div class="big-num" id="t-num">0</div><div class="big-lbl" id="t-lbl">kcal left</div></div>
      <div class="pills"><span class="pill">Eaten <b id="t-eaten">0</b></span><span class="pill">Goal <b id="t-goal">0</b></span></div>
    </div>
    <h3>Eaten today</h3>
    <div id="t-list"></div>
  </section>`;
}

function renderToday({ hold } = {}) {
  const view = $('#view');
  if (!$('#today', view)) {
    view.innerHTML = todaySkeleton();
    shownLeft = shownEaten = listIds = null;
    const L = ensureLula();
    $('#lula-slot').appendChild(lulaHost);
    if (!L) $('#lula-slot').textContent = '🦑';
  }
  $('#t-date').textContent = `${dayLabel(dayKey())} · resets at ${pad(DAY_START_HOUR)}:00`;
  let entries = todayEntries();
  if (hold) entries = entries.filter((e) => e.id !== hold.hideId);
  const eaten = entries.reduce((a, e) => a + e.kcal, 0);
  updateHero(eaten, S.goal, entries.length);
  updateList(entries);
}

function updateHero(eaten, goal, count) {
  const left = goal - eaten, p = eaten / goal;
  const numEl = $('#t-num'), lbl = $('#t-lbl'), wrap = $('#t-numwrap');
  const draw = (v) => {
    const over = Math.round(v) < 0;
    numEl.textContent = fmt(Math.abs(v));
    if (wrap.classList.contains('over') !== over) { wrap.classList.toggle('over', over); lbl.textContent = over ? 'kcal over' : 'kcal left'; }
  };
  const changed = shownLeft !== null && shownLeft !== left;
  roll(numEl, shownLeft ?? left, left, draw);
  if (changed) bump(numEl, 1.1);
  shownLeft = left;
  const eEl = $('#t-eaten');
  roll(eEl, shownEaten ?? eaten, eaten, (v) => { eEl.textContent = fmt(v); });
  shownEaten = eaten;
  $('#t-goal').textContent = fmt(goal);
  const bar = $('#t-bar');
  requestAnimationFrame(() => { bar.style.strokeDashoffset = RING_C * (1 - Math.min(p, 1)); bar.style.stroke = ringColor(p); });
  const q = quipFor(eaten, goal, count), qEl = $('#t-quip');
  if (qEl.textContent !== q) { qEl.textContent = q; if (changed) bump(qEl, 1.05); }
  const mood = MOOD_OF[bucketFor(eaten, goal, count)];
  const L = ensureLula(mood);
  if (L && L.mood !== mood) L.setMood(mood);
}

function updateList(entries) {
  const box = $('#t-list');
  const prev = listIds;
  listIds = new Set(entries.map((e) => e.id));
  if (!entries.length) {
    box.innerHTML = `<div class="empty rise-in"><span class="em-big">🫧</span>Nothing logged yet today.<br>Tap <b>Add food</b> to start.</div>`;
    return;
  }
  box.innerHTML = `<div class="card">${[...entries].reverse().map((e, i) => {
    const t = new Date(e.t);
    const parts = e.items.map((it) => it.name).join(', ');
    const cls = !prev ? ' rise-in' : prev.has(e.id) ? '' : ' pop-in';
    return `<button class="row-btn${cls}" style="--i:${i}" data-act="edit-entry" data-id="${e.id}">
      <span class="em">${esc(e.emoji || '🍽️')}</span>
      <span class="main"><div class="title">${esc(e.name)}</div><div class="meta">${pad(t.getHours())}:${pad(t.getMinutes())} · ${esc(parts)}</div></span>
      <span class="kcal">${fmt(e.kcal)} <small>kcal</small></span>
    </button>`;
  }).join('')}</div>`;
}

// After "Eat it!": show the old numbers, fly the emoji into Lula, then roll to the new total
function feedAndShow(entry, firstToday) {
  tab = 'today';
  window.scrollTo(0, 0);
  render({ hold: { hideId: entry.id } });
  const finish = () => { render(); afterLog(firstToday); };
  setTimeout(() => {
    const L = ensureLula();
    if (L && tab === 'today') L.feed(entry.emoji || '🍽️').then(finish); else finish();
  }, 420);
}
function afterLog(firstToday) {
  const left = S.goal - eatenOn(dayKey());
  toast(`${pick(QUIPS.logged, Date.now())} ${left >= 0 ? fmt(left) + ' kcal left' : fmt(-left) + ' kcal over'}`);
  if (Math.abs(left) <= S.goal * CELEBRATE_WITHIN) {
    confetti(30);
    if (lula && lula.mood !== 'target') lula.celebrate();   // setMood('target') already celebrates
  } else if (firstToday && lula) {
    lula.confetti(10);
    lula.say('First bite of the day! 🎉', 2400);
  }
}

/* =========================================================
   Add flow: choose a saved meal / build from scratch
   ========================================================= */
const sheetHead = (n, title) => `<header class="sheet-head"><button class="icon-btn" data-act="close${n}" aria-label="Close">✕</button><h2>${title}</h2><span></span></header>`;

function openAdd() {
  openSheet(1, `
    ${sheetHead(1, 'What are we eating?')}
    <div class="sheet-body">
      <div class="big-choice">
        <button data-act="scratch"><span>🧑‍🍳</span>Build a meal</button>
        <button data-act="quick"><span>⚡</span>Just calories</button>
      </div>
      <h3>Saved meals</h3>
      <input class="search" id="add-search" placeholder="Search meals…" autocomplete="off">
      <div id="add-list" style="margin-top:12px">${mealList('')}</div>
    </div>`);
}
function mealList(q) {
  const qq = norm(q);
  const meals = S.meals.filter((m) => norm(m.name).includes(qq));
  if (!meals.length) return `<div class="empty">${S.meals.length ? 'No meal matches.' : 'No saved meals yet — build one and tick “save as meal”.'}</div>`;
  return `<div class="card">${meals.map((m, i) => `
    <button class="row-btn rise-in" style="--i:${i}" data-act="use-meal" data-id="${m.id}">
      <span class="em">${esc(m.emoji || '🍽️')}</span>
      <span class="main"><div class="title">${esc(m.name)}</div><div class="meta">${esc(m.items.map((it) => it.name).join(', '))}</div></span>
      <span class="kcal">${fmt(sumKcal(refreshItems(m.items)))} <small>kcal</small></span>
    </button>`).join('')}</div>`;
}

/* =========================================================
   Composer — the meal being built / edited
   ========================================================= */
let draft = null;
// draft = { mode: 'log' | 'template', entryId, entryDay, mealId, name, emoji, items: [...], saveMeal }

// Take latest kcal/name from the ingredient base (if it still exists)
function refreshItems(items) {
  return items.map((it) => {
    const ing = it.ingId && ingById(it.ingId);
    return ing ? { ...it, name: ing.name, emoji: ing.emoji, unit: ing.unit, per: ing.per } : { ...it };
  });
}

function startDraft(opts) {
  draft = { mode: 'log', entryId: null, entryDay: null, mealId: null, name: '', emoji: '🍽️', items: [], saveMeal: false, ...opts };
  renderComposer();
}

function renderComposer() {
  const d = draft;
  const editingEntry = !!d.entryId;
  const meal = d.mealId && mealById(d.mealId);
  const title = d.mode === 'template' ? (meal ? 'Edit meal' : 'New meal') : editingEntry ? 'Edit entry' : 'Log a meal';

  let saveOpt = '';
  if (d.mode === 'log') {
    const label = meal ? `Also update saved meal “${esc(meal.name)}”` : 'Save as a reusable meal';
    saveOpt = `<label class="check"><input type="checkbox" id="d-save" ${d.saveMeal ? 'checked' : ''}><span class="sw"></span>${label}</label>`;
  }
  const commitLabel = d.mode === 'template' ? 'Save meal 💾' : editingEntry ? 'Save changes ✅' : 'Eat it! 🍽️';
  const delBtn = (d.mode === 'template' && meal) || editingEntry
    ? `<button class="btn danger" data-act="d-delete">${editingEntry ? 'Delete entry' : 'Delete meal'}</button>` : '';

  openSheet(1, `
    ${sheetHead(1, title)}
    <div class="sheet-body">
      <div class="namebar">
        <input id="d-emoji" class="emoji-in" value="${esc(d.emoji)}" maxlength="8" aria-label="Emoji">
        <input id="d-name" value="${esc(d.name)}" placeholder="Name (e.g. Lunch)" autocomplete="off">
      </div>
      <div id="d-items">${itemsHtml(-1, true)}</div>
      <button class="btn ghost" data-act="pick-ing">＋ Add ingredient</button>
      <button class="btn ghost" data-act="add-kcal">＋ Add plain calories</button>
      ${saveOpt}
      ${delBtn}
    </div>
    <footer class="sheet-foot">
      <div class="foot-row">
        <div class="mini-lula" id="mini-lula"></div>
        <div class="totals"><div class="t" id="d-total"></div><div class="after" id="d-after"></div></div>
      </div>
      <button class="btn primary" data-act="d-commit">${commitLabel}</button>
    </footer>`);
  if (window.Lula) miniLula = Lula.create($('#mini-lula'), { mood: 'hungry' });
  updateTotals();
}

function itemsHtml(newIdx = -1, first = false) {
  if (!draft.items.length) return `<div class="empty"><span class="em-big">🥄</span>Add ingredients and type how much — grams, ml or units.</div>`;
  return draft.items.map((it, i) => `
    <div class="item${i === newIdx ? ' pop-in' : first ? ' rise-in' : ''}" style="--i:${i}">
      <span class="em">${esc(it.emoji || '•')}</span>
      <div class="nm">${esc(it.name)}<small>${perText(it.unit, it.per)}</small></div>
      <label class="qtybox"><input class="qty" data-i="${i}" inputmode="decimal" value="${esc(it.qty)}" placeholder="0" aria-label="Amount of ${esc(it.name)}"><span class="u">${unitShort(it.unit)}</span></label>
      <span class="ik" id="ik-${i}">${fmt(itemKcal(it))}</span>
      <button class="rm" data-act="rm-item" data-i="${i}" aria-label="Remove">✕</button>
    </div>`).join('');
}

function updateTotals() {
  const total = Math.round(sumKcal(draft.items));
  const tEl = $('#d-total');
  if (tEl.dataset.v !== undefined && tEl.dataset.v !== String(total)) bump(tEl, 1.06);
  tEl.dataset.v = total;
  tEl.innerHTML = `${fmt(total)} <small>kcal</small>`;
  const after = $('#d-after');
  let mood = total ? 'light' : 'hungry';
  if (draft.mode !== 'log') { after.textContent = ''; mood = total ? 'cruising' : 'hungry'; }
  else {
    const day = draft.entryDay || dayKey();
    const already = (S.log[day] || []).filter((e) => e.id !== draft.entryId).reduce((a, e) => a + e.kcal, 0);
    const left = S.goal - already - total;
    after.innerHTML = left >= 0 ? `then <b class="ok">${fmt(left)}</b> left` : `then <b class="no">${fmt(-left)}</b> over 😬`;
    if (left < 0) mood = 'careful';
  }
  if (miniLula && miniLula.mood !== mood) miniLula.setMood(mood);
}

function focusLastQty() {
  const inputs = document.querySelectorAll('#d-items input.qty');
  const last = inputs[inputs.length - 1];
  if (!last) return;
  last.focus({ preventScroll: true });
  const body = $('#sheet1 .sheet-body'), row = last.closest('.item');
  body.scrollTo({ top: Math.max(0, row.offsetTop - body.clientHeight / 2), behavior: reduced() ? 'auto' : 'smooth' });
}
function addIngredientToDraft(ing) {
  draft.items.push({ ingId: ing.id, name: ing.name, emoji: ing.emoji, unit: ing.unit, per: ing.per, qty: '' });
  $('#d-items').innerHTML = itemsHtml(draft.items.length - 1);
  updateTotals();
  focusLastQty();
  sfx('pop');
}

function commitDraft() {
  const d = draft;
  d.name = $('#d-name').value.trim();
  d.emoji = $('#d-emoji').value.trim() || '🍽️';
  const items = d.items.filter((it) => num(it.qty) > 0).map((it) => ({ ...it, qty: num(it.qty) }));

  if (d.mode === 'template') {
    if (!d.name) return toast('Give the meal a name 🙂');
    if (!items.length) return toast('Add at least one ingredient');
    const existing = d.mealId && mealById(d.mealId);
    if (existing) Object.assign(existing, { name: d.name, emoji: d.emoji, items });
    else S.meals.push({ id: uid(), name: d.name, emoji: d.emoji, items });
    save(); closeSheet(1); render();
    return toast(existing ? 'Meal updated 💾' : 'Meal saved 💾');
  }

  if (!items.length) return toast('Type an amount for at least one item');
  const kcal = Math.round(sumKcal(items));
  const name = d.name || (items.length === 1 ? items[0].name : 'Meal');
  let newEntry = null, firstToday = false;

  if (d.entryId) {
    const list = S.log[d.entryDay] || [];
    const e = list.find((x) => x.id === d.entryId);
    if (e) Object.assign(e, { name, emoji: d.emoji, items, kcal });
  } else {
    const day = dayKey();
    firstToday = !(S.log[day] || []).length;
    newEntry = { id: uid(), t: Date.now(), name, emoji: d.emoji, items, kcal };
    (S.log[day] ||= []).push(newEntry);
    items.forEach((it) => { const ing = it.ingId && ingById(it.ingId); if (ing) ing.used = (ing.used || 0) + 1; });
  }

  if ($('#d-save')?.checked) {
    const meal = d.mealId && mealById(d.mealId);
    if (meal) Object.assign(meal, { name, emoji: d.emoji, items });
    else S.meals.push({ id: uid(), name, emoji: d.emoji, items });
  }

  save(); closeSheet(1);
  if (newEntry) feedAndShow(newEntry, firstToday);
  else { render(); toast('Entry updated ✅'); setTimeout(() => poof(), 250); }
}

function deleteDraftTarget() {
  const d = draft;
  if (d.entryId) {
    if (!confirm('Delete this entry?')) return;
    S.log[d.entryDay] = (S.log[d.entryDay] || []).filter((e) => e.id !== d.entryId);
    toast('Entry deleted 🗑️');
  } else if (d.mealId) {
    if (!confirm('Delete this saved meal?')) return;
    S.meals = S.meals.filter((m) => m.id !== d.mealId);
    toast('Meal deleted 🗑️');
  }
  save(); closeSheet(1); render();
  setTimeout(() => poof(), 250);
}

/* =========================================================
   Ingredient picker + ingredient form (sheet 2)
   ========================================================= */
function openPicker() {
  openSheet(2, `
    ${sheetHead(2, 'Add ingredient')}
    <div class="sheet-body">
      <input class="search" id="p-search" placeholder="Search ingredients…" autocomplete="off">
      <div id="p-list" style="margin-top:12px">${pickerList('')}</div>
    </div>`);
}
function pickerList(q) {
  const qq = norm(q);
  const list = sortedIngredients().filter((i) => norm(i.name).includes(qq));
  return `
    <button class="btn soft" data-act="new-ing" data-ctx="picker" data-name="${esc(q)}">＋ New ingredient${q ? ` “${esc(q)}”` : ''}</button>
    ${list.length ? `<div class="card">${list.map((i) => `
      <button class="row-btn" data-act="pick" data-id="${i.id}">
        <span class="em">${esc(i.emoji)}</span>
        <span class="main"><div class="title">${esc(i.name)}</div><div class="meta">${perText(i.unit, i.per)}</div></span>
      </button>`).join('')}</div>` : ''}`;
}

let ingForm = null; // { id|null, ctx: 'picker' | 'tab', unit }
function openIngForm(ing, ctx, presetName = '') {
  ingForm = { id: ing?.id || null, ctx, unit: ing?.unit || 'g' };
  openSheet(2, `
    ${sheetHead(2, ing ? 'Edit ingredient' : 'New ingredient')}
    <div class="sheet-body">
      <div class="field-row">
        <label class="field"><span>Emoji</span><input id="i-emoji" class="emoji-in" value="${esc(ing?.emoji || '🍴')}" maxlength="8"></label>
        <label class="field"><span>Name</span><input id="i-name" value="${esc(ing?.name || presetName)}" placeholder="e.g. Feta cheese" autocomplete="off"></label>
      </div>
      <div class="field"><span>Measured in</span>
        <div class="seg" id="i-unit">
          ${['g', 'ml', 'un'].map((u) => `<button data-act="i-unit" data-u="${u}" class="${ingForm.unit === u ? 'on' : ''}">${u === 'un' ? 'units' : u === 'g' ? 'grams' : 'ml'}</button>`).join('')}
        </div>
      </div>
      <label class="field"><span id="i-per-lbl"></span><input id="i-per" inputmode="decimal" value="${ing ? esc(ing.per) : ''}" placeholder="0"></label>
      <p class="hint">Tip: copy it from the nutrition label on the package.</p>
      <button class="btn primary" data-act="i-save">Save ingredient</button>
      ${ing ? '<button class="btn danger" data-act="i-delete">Delete ingredient</button>' : ''}
    </div>`);
  updatePerLabel();
  if (!ing) setTimeout(() => $(presetName ? '#i-per' : '#i-name')?.focus(), 350);
}
function updatePerLabel() {
  $('#i-per-lbl').textContent = ingForm.unit === 'un' ? 'Calories per unit (kcal)' : `Calories per 100 ${ingForm.unit} (kcal)`;
}
function saveIngForm() {
  const name = $('#i-name').value.trim();
  const per = num($('#i-per').value);
  const emoji = $('#i-emoji').value.trim() || '🍴';
  if (!name) return toast('Give it a name 🙂');
  if (per <= 0 && !confirm('0 kcal? (e.g. water, black coffee) — save anyway?')) return;
  let ing = ingForm.id && ingById(ingForm.id);
  if (ing) Object.assign(ing, { name, emoji, unit: ingForm.unit, per });
  else { ing = { id: uid(), name, emoji, unit: ingForm.unit, per, used: 0 }; S.ingredients.push(ing); }
  save();
  closeSheet(2);
  if (ingForm.ctx === 'picker' && draft) addIngredientToDraft(ing);
  else render();
  toast('Ingredient saved 🥕');
}

/* =========================================================
   Meals / Ingredients / More tabs
   ========================================================= */
function viewMeals() {
  return `
    <h1>Meals</h1>
    <p class="sub">Your go-to combos. Tap to edit, or ＋ Eat to log it now.</p>
    <button class="btn soft" data-act="new-meal">＋ New meal</button>
    ${S.meals.length ? S.meals.map((m) => `
      <div class="meal-card">
        <button class="main" data-act="edit-meal" data-id="${m.id}">
          <span class="em">${esc(m.emoji || '🍽️')}</span>
          <span class="txt"><div class="title">${esc(m.name)}</div><div class="meta"><span class="kc">${fmt(sumKcal(refreshItems(m.items)))} kcal</span> · ${esc(m.items.map((i) => i.name).join(', '))}</div></span>
        </button>
        <button class="mini" data-act="use-meal" data-id="${m.id}">＋ Eat</button>
      </div>`).join('') : '<div class="empty"><span class="em-big">📖</span>No meals saved yet.</div>'}`;
}

let ingQuery = '';
function viewIngredients() {
  return `
    <h1>Ingredients</h1>
    <p class="sub">${S.ingredients.length} in your base · most used first</p>
    <input class="search" id="ing-search" placeholder="Search…" autocomplete="off" value="${esc(ingQuery)}">
    <button class="btn soft" data-act="new-ing" data-ctx="tab">＋ New ingredient</button>
    <div id="ing-list">${ingTabList()}</div>`;
}
function ingTabList() {
  const qq = norm(ingQuery);
  const list = sortedIngredients().filter((i) => norm(i.name).includes(qq));
  if (!list.length) return '<div class="empty">No ingredient matches.</div>';
  return `<div class="card">${list.map((i) => `
    <button class="row-btn" data-act="edit-ing" data-id="${i.id}">
      <span class="em">${esc(i.emoji)}</span>
      <span class="main"><div class="title">${esc(i.name)}</div><div class="meta">${perText(i.unit, i.per)}</div></span>
    </button>`).join('')}</div>`;
}

// Tiny Lula head per day in the history chart
function faceSvg(p) {
  const c = p <= 0.7 ? 'var(--good)' : p <= 1 ? 'var(--warn)' : 'var(--bad)';
  const mouth = p <= 1 ? '<path d="M10 17Q12 19 14 17" fill="none" stroke="#0D2B6B" stroke-width="1.6" stroke-linecap="round"/>' : '<ellipse cx="12" cy="17.5" rx="1.6" ry="1.9" fill="#0D2B6B"/>';
  return `<svg class="face" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5C15.5 3 19.5 8.5 19.5 13.5C19.5 18.5 16 21.8 12 21.8C8 21.8 4.5 18.5 4.5 13.5C4.5 8.5 8.5 3 12 1.5Z" style="fill:${c}" stroke="#0D2B6B" stroke-width="1.6"/><circle cx="9.4" cy="13.4" r="1.6" fill="#0D2B6B"/><circle cx="14.6" cy="13.4" r="1.6" fill="#0D2B6B"/>${mouth}</svg>`;
}
let histSel = null;
function histDays() {
  const days = [];
  const base = new Date(Date.now() - DAY_START_HOUR * 3600e3);
  for (let i = 13; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
    days.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
  }
  return days;
}
function histCaption(k) {
  const v = eatenOn(k);
  return `${dayLabel(k)} · ${v ? `${fmt(v)} kcal (${Math.round((v / S.goal) * 100)}%)` : 'nothing logged'}`;
}
function viewMore() {
  const days = histDays();
  if (!histSel || !days.includes(histSel)) histSel = days[13];
  const cols = days.map((k, i) => {
    const v = eatenOn(k), p = v / S.goal, h = (Math.min(p, 1.3) / 1.3) * 100;
    return `<button class="col${k === histSel ? ' sel' : ''}" data-act="hist" data-k="${k}" style="--i:${i}" aria-label="${dayLabel(k)}: ${v ? fmt(v) + ' kcal' : 'nothing logged'}">
      ${v ? faceSvg(p) : '<span class="nodot"></span>'}<i class="bar" style="height:${v ? Math.max(h, 4) : 0}px;background:${v ? ringColor(p) : 'transparent'}"></i></button>`;
  }).join('');
  const labels = days.map((k) => {
    const [y, m, d] = k.split('-').map(Number);
    return `<span>${new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'narrow' })}<b>${d}</b></span>`;
  }).join('');
  return `
    <h1>More</h1>
    <h3>Daily goal</h3>
    <label class="field goal-box"><input id="goal" inputmode="numeric" value="${S.goal}" aria-label="Daily goal in kcal"><span>kcal</span></label>
    <h3>Last 14 days</h3>
    <div class="card hist-card">
      <div class="plot"><div class="goal-line"></div>${cols}</div>
      <div class="labels">${labels}</div>
      <div class="hist-cap" id="hist-cap">${histCaption(histSel)}</div>
    </div>
    <h3>Lula</h3>
    <div class="card set-card">
      <div class="row"><label class="check" style="padding:0;flex:1"><input type="checkbox" id="p-sound" ${P.sound ? 'checked' : ''}><span class="sw"></span>Cartoon sounds</label></div>
      <div class="row"><span>Theme</span><div class="seg" id="p-theme">
        ${[['auto', 'Auto'], ['light', 'Light'], ['dark', 'Deep sea']].map(([v, l]) => `<button data-act="theme" data-v="${v}" class="${P.theme === v ? 'on' : ''}">${l}</button>`).join('')}
      </div></div>
    </div>
    <h3>Backup</h3>
    <p class="sub">Your data lives only on this phone. Export a backup now and then.</p>
    <button class="btn soft" data-act="export">⬇️ Export backup</button>
    <button class="btn soft" data-act="import">⬆️ Import backup</button>
    <input type="file" id="import-file" accept="application/json,.json" hidden>
    <p class="foot-note">Nata 🦑 with Lula · works offline · day resets at ${pad(DAY_START_HOUR)}:00</p>`;
}

async function exportData() {
  const json = JSON.stringify(S, null, 1);
  const name = `nata-backup-${dayKey()}.json`;
  const file = new File([json], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function importData(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const s = JSON.parse(r.result);
      if (!Array.isArray(s.ingredients) || !Array.isArray(s.meals) || typeof s.log !== 'object') throw new Error();
      if (!confirm('Replace everything on this phone with this backup?')) return;
      S = s; save(); render(); toast('Backup restored 📦');
    } catch { toast('That file doesn\'t look like a Nata backup 🤔'); }
  };
  r.readAsText(file);
}

/* =========================================================
   Events (one delegated listener for everything)
   ========================================================= */
function bounceTab(btn) {
  const ic = btn.querySelector('.ti');
  if (!ic || reduced()) return;
  ic.animate([
    { transform: 'scale(1) translateY(0)' }, { transform: 'scale(1.25,.8) translateY(3px)', offset: 0.25 },
    { transform: 'scale(.9,1.15) translateY(-7px)', offset: 0.55 }, { transform: 'scale(1.04,.96) translateY(0)', offset: 0.8 }, { transform: 'scale(1)' },
  ], { duration: 560, easing: 'ease-out' });
}

document.addEventListener('pointerdown', (ev) => {
  if (tab === 'today' && lula && !ev.target.closest('.sheet.open, .lula')) lula.lookAt(ev.clientX, ev.clientY);
}, { passive: true });

document.addEventListener('click', (ev) => {
  const tabBtn = ev.target.closest('.tabs button');
  if (tabBtn) {
    bounceTab(tabBtn); sfx('blip');
    if (tab !== tabBtn.dataset.tab) { tab = tabBtn.dataset.tab; render(); window.scrollTo(0, 0); }
    return;
  }

  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const { act, id } = el.dataset;

  switch (act) {
    case 'add': openAdd(); break;
    case 'close1': closeSheet(1); break;
    case 'close2': closeSheet(2); break;
    case 'scratch': startDraft({}); break;
    case 'quick': startDraft({ name: 'Quick add', emoji: '⚡', items: [{ ingId: null, name: 'Calories', emoji: '🔥', unit: 'kcal', per: 1, qty: '' }] });
      setTimeout(() => $('#d-items input.qty')?.focus(), 350); break;
    case 'use-meal': {
      const m = mealById(id);
      startDraft({ mealId: m.id, name: m.name, emoji: m.emoji, items: refreshItems(m.items) });
      break;
    }
    case 'edit-entry': {
      const day = dayKey();
      const e = (S.log[day] || []).find((x) => x.id === id);
      if (e) startDraft({ entryId: e.id, entryDay: day, name: e.name, emoji: e.emoji, items: e.items.map((i) => ({ ...i })) });
      break;
    }
    case 'new-meal': startDraft({ mode: 'template' }); break;
    case 'edit-meal': {
      const m = mealById(id);
      startDraft({ mode: 'template', mealId: m.id, name: m.name, emoji: m.emoji, items: refreshItems(m.items) });
      break;
    }
    case 'pick-ing': openPicker(); setTimeout(() => $('#p-search')?.focus(), 350); break;
    case 'pick': closeSheet(2); addIngredientToDraft(ingById(id)); break;
    case 'add-kcal':
      draft.items.push({ ingId: null, name: 'Calories', emoji: '🔥', unit: 'kcal', per: 1, qty: '' });
      $('#d-items').innerHTML = itemsHtml(draft.items.length - 1); updateTotals(); focusLastQty();
      break;
    case 'rm-item': {
      const row = el.closest('.item');
      if (row.dataset.gone) break;
      row.dataset.gone = '1';
      const done = () => { draft.items.splice(Number(el.dataset.i), 1); $('#d-items').innerHTML = itemsHtml(); updateTotals(); };
      if (reduced()) { done(); break; }
      row.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'translateX(40px) scale(.7)' }], { duration: 220, easing: 'ease-in', fill: 'forwards' }).onfinish = done;
      sfx('pfft');
      break;
    }
    case 'd-commit': commitDraft(); break;
    case 'd-delete': deleteDraftTarget(); break;
    case 'new-ing': openIngForm(null, el.dataset.ctx, el.dataset.name || ''); break;
    case 'edit-ing': openIngForm(ingById(id), 'tab'); break;
    case 'i-unit':
      ingForm.unit = el.dataset.u;
      document.querySelectorAll('#i-unit button').forEach((b) => b.classList.toggle('on', b.dataset.u === ingForm.unit));
      updatePerLabel();
      break;
    case 'i-save': saveIngForm(); break;
    case 'i-delete':
      if (confirm('Delete this ingredient? (Past entries keep their calories.)')) {
        S.ingredients = S.ingredients.filter((i) => i.id !== ingForm.id);
        save(); closeSheet(2); render(); toast('Ingredient deleted 🗑️'); poof();
      }
      break;
    case 'hist':
      histSel = el.dataset.k;
      document.querySelectorAll('.col').forEach((c) => c.classList.toggle('sel', c === el));
      $('#hist-cap').textContent = histCaption(histSel);
      break;
    case 'theme':
      P.theme = el.dataset.v; savePrefs(); applyPrefs();
      document.querySelectorAll('#p-theme button').forEach((b) => b.classList.toggle('on', b === el));
      break;
    case 'export': exportData(); break;
    case 'import': $('#import-file').click(); break;
  }
});

document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.matches('input.qty')) {
    const i = Number(t.dataset.i);
    draft.items[i].qty = t.value;
    $('#ik-' + i).textContent = fmt(itemKcal(draft.items[i]));
    updateTotals();
  } else if (t.id === 'add-search') $('#add-list').innerHTML = mealList(t.value);
  else if (t.id === 'p-search') $('#p-list').innerHTML = pickerList(t.value);
  else if (t.id === 'ing-search') { ingQuery = t.value; $('#ing-list').innerHTML = ingTabList(); }
  else if (t.id === 'd-save' && draft) draft.saveMeal = t.checked;
});

document.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.id === 'goal') {
    const g = Math.round(num(t.value));
    if (g >= 500 && g <= 10000) { S.goal = g; save(); toast(`Goal set to ${fmt(g)} kcal 🎯`); }
    else { t.value = S.goal; toast('Pick a goal between 500 and 10 000'); }
  } else if (t.id === 'p-sound') {
    P.sound = t.checked; savePrefs(); applyPrefs(); if (P.sound) sfx('blip');
  } else if (t.id === 'import-file' && t.files[0]) {
    importData(t.files[0]);
    t.value = '';
  }
});

// Enter key in the picker search picks the first result
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter') return;
  if (ev.target.id === 'p-search') { ev.preventDefault(); $('#p-list [data-act="pick"]')?.click(); }
  if (ev.target.matches('input.qty')) ev.target.blur();
});

/* =========================================================
   Day rollover at 05:00, night mood, pausing + offline support
   ========================================================= */
function checkDay() {
  const k = dayKey();
  if (k !== currentDay) { currentDay = k; if (tab === 'today' || tab === 'more') render(); }
  else if (tab === 'today') renderToday();   // picks up night ↔ day mood changes
}
setInterval(checkDay, 30_000);
document.addEventListener('visibilitychange', () => {
  document.body.classList.toggle('paused', document.hidden);
  if (!document.hidden) checkDay();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

render();
