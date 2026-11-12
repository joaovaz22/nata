/* Lula the squid: a rigged, mood-driven inline SVG mascot. Vanilla JS, no dependencies, works offline.
   Usage: const lula = Lula.create(hostEl, { mood: 'cruising' });
          lula.setMood('target'); lula.tap(); lula.feed('🍝'); lula.celebrate(); lula.ink(true); lula.say('Hi!'); lula.lookAt(x, y);
          Lula.moodFor(eaten, goal, entryCount, date) -> mood key.  Lula.sfx.enabled = true to turn on sounds. */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const OUT = '#0D2B6B', IRIS = '#081536', TONGUE = '#FF7EA6', BLUSH = '#FF4F86';
  const mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* ---------- TWEAK HERE: moods ----------
     tint: [highlight, mid, shade] · eyes: open|plead|star|spiral|sleep|joy · mouth: smile|grin|content|o|bigO|wobble|sheepish|chomp|tiny
     pose: key in POSES · amp: tentacle swing (deg) · wd: swing duration (s) · bob: float period (s) · bobA: float height (px)
     look: fixed eye offset · lid: 0..1 eyelid droop · puff: [scaleX, scaleY] */
  const MOODS = {
    hungry:   { tint: ['#C4DDFF', '#8DB8FF', '#6493EE'], eyes: 'plead', mouth: 'o', blush: 0.12, pose: 'watch', amp: 5, wd: 2.8, bob: 3.6, bobA: 6, watch: true },
    light:    { tint: ['#B9B4FF', '#7F88FF', '#5B5FEA'], eyes: 'open', mouth: 'smile', blush: 0.5, pose: 'base', amp: 15, wd: 1.1, bob: 1.6, bobA: 12 },
    cruising: { tint: ['#8FCDFF', '#3E95FF', '#2369E0'], eyes: 'open', mouth: 'content', blush: 0.3, pose: 'base', amp: 7, wd: 2.6, bob: 3.4, bobA: 8, slowBlink: true },
    careful:  { tint: ['#8FCDFF', '#3E95FF', '#2369E0'], eyes: 'open', mouth: 'wobble', blush: 0.1, pose: 'crossed', amp: 3, wd: 0.8, bob: 2.6, bobA: 5, look: [4.5, -1], lid: 0.42, sweat: true },
    target:   { tint: ['#B9B4FF', '#7F88FF', '#5B5FEA'], eyes: 'star', mouth: 'grin', blush: 0.55, pose: 'cheer', amp: 12, wd: 0.9, bob: 1.4, bobA: 12 },
    over:     { tint: ['#A69CFF', '#6460F2', '#4636CC'], eyes: 'open', mouth: 'sheepish', blush: 0.9, pose: 'shrug', amp: 5, wd: 2, bob: 3, bobA: 7, look: [-2, 1.5], lid: 0.18 },
    way:      { tint: ['#A584FF', '#6B46EA', '#4A24BA'], eyes: 'spiral', mouth: 'bigO', blush: 0.6, pose: 'puffed', amp: 6, wd: 1.6, bob: 2.4, bobA: 6, puff: [1.16, 1.04] },
    night:    { tint: ['#93BDF2', '#4F82DA', '#3159B0'], eyes: 'sleep', mouth: 'tiny', blush: 0.35, pose: 'droop', amp: 3, wd: 3.6, bob: 4.4, bobA: 5, cap: true },
  };
  // Tentacle angles (deg, 0 = straight down, + = tip swings left), one per tentacle left→right
  const POSES = {
    base:    [42, 20, 6, -6, -20, -42],
    watch:   [40, 20, 6, -6, -58, -88],
    crossed: [24, 14, -20, 20, -14, -24],
    cheer:   [125, 40, 8, -8, -40, -125],
    shrug:   [100, 24, 6, -6, -24, -100],
    puffed:  [62, 32, 10, -10, -32, -62],
    droop:   [20, 10, 3, -3, -10, -20],
  };
  // Looping gags per mood: every = ms between runs (±20%)
  const LOOPS = {
    hungry:   { every: 5200, first: 1500, fn() { (this._alt = !this._alt) ? this.growl() : this.rise('?', 182, 40, 'l-txt', 6); } },
    light:    { every: 3600, fn() { this.hop(); if (Math.random() < 0.5) this.bubbles(2, 120, 190); } },
    cruising: { every: 3000, fn() { this.rise(Math.random() < 0.5 ? '♪' : '♫', 162 + rand(-6, 6), 150, 'l-txt', rand(4, 12)); } },
    careful:  { every: 4200, fn() { this.setLook(-4.5, -1); this.after(650, () => this.restoreLook()); } },
    target:   { every: 6500, first: 2600, fn() { this.spin(); this.confetti(10); } },
    over:     { every: 5400, fn() { this.shrug(); this.after(450, () => this.ink(false)); if (Math.random() < 0.5) this.after(700, () => this.rise('oops', 120, 26, 'l-txt', 0)); } },
    way:      { every: 6800, first: 900, fn() { this.ink(true); } },
    night:    { every: 2400, first: 600, fn() { this.rise((this._alt = !this._alt) ? 'z' : 'Z', 168 + rand(0, 8), 36, 'l-txt', 14); } },
  };
  const JOKES = [
    'Why don\'t squids fight? They\'re well-armed. 🦑',
    'Tickles! My tentacles are very sensitive.',
    'Ink-redible tap. 10/10.',
    'Six arms and zero snacks. Coincidence?',
    'Squid pro quo: you tap, I wiggle.',
    'I\'m not short, I\'m fun-sized.',
  ];
  const SLEEPY = ['Zzz… five more minutes…', 'Shh. Dreaming of shrimp. 🦐', 'Kitchen\'s closed till 5. 😴'];

  /* ---------- geometry ---------- */
  const BODY = 'M120 12 C138 18 166 62 175 112 C182 150 168 182 120 182 C72 182 58 150 65 112 C74 62 102 18 120 12 Z';
  const FINL = 'M116 24 C92 22 70 42 72 70 C73 80 78 88 84 92 C88 78 96 66 106 60 Z';
  const FINR = 'M124 24 C148 22 170 42 168 70 C167 80 162 88 156 92 C152 78 144 66 134 60 Z';
  const TX = [84, 99, 113, 127, 141, 156], TY = 168, TL = [54, 66, 74, 74, 66, 54], TC = [-5, 5, -4, 4, -5, 5];
  const EYES = [[96, 134], [144, 134]];

  function starPath(cx, cy, R, r) {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r : R;
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1);
    }
    return d + 'Z';
  }
  function spiralPath(cx, cy) {
    let d = '';
    for (let i = 0; i <= 60; i++) {
      const t = i / 60, a = t * Math.PI * 5, rr = 1 + 12 * t;
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1);
    }
    return d;
  }
  function tentacle(i, p) {
    const x = TX[i], L = TL[i], c = TC[i], w = 9, o = `transform-origin:${x}px ${TY}px`;
    const shape = `M${-w} 0 C${-w} ${L * 0.42} ${c - w * 0.45} ${L * 0.7} ${c - 3} ${L - 3} Q${c} ${L + 4} ${c + 3} ${L - 3} C${c + w * 0.45} ${L * 0.7} ${w} ${L * 0.42} ${w} 0 Z`;
    const hl = `M-3 8 Q${c * 0.4 - 3} ${L * 0.45} ${c - 1.5} ${L - 10}`;
    const wx = c * 0.7, wy = L * 0.58;
    const watch = i === 5 ? `<g class="l-watch" style="display:none"><rect x="${wx - 10}" y="${wy}" width="20" height="7" rx="3" fill="#FF8A3D" stroke="${OUT}" stroke-width="2"/><circle cx="${wx}" cy="${wy + 3.5}" r="6" fill="#fff" stroke="${OUT}" stroke-width="2"/><path d="M${wx} ${wy + 3.5}v-3.5M${wx} ${wy + 3.5}h2.5" stroke="${OUT}" stroke-width="1.4" stroke-linecap="round"/></g>` : '';
    return `<g class="l-pose" style="${o}"><g class="l-wave" style="${o};animation-delay:${(-i * 0.32).toFixed(2)}s"><g transform="translate(${x} ${TY})">
      <path d="${shape}" style="fill:url(#${p}t)" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
      <path d="${hl}" fill="none" style="stroke:var(--lh)" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>${watch}</g></g></g>`;
  }
  function eye(side, p) {
    const [cx, cy] = EYES[side], o = `transform-origin:${cx}px ${cy}px`;
    return `<g class="l-eye">
      <g class="l-look">
        <g data-v="open"><circle cx="${cx}" cy="${cy}" r="15" fill="${IRIS}"/><circle cx="${cx}" cy="${cy + 6}" r="8" fill="#2C4C8C" opacity=".55"/>
          <circle cx="${cx + 5}" cy="${cy - 5}" r="5" fill="#fff"/><circle cx="${cx - 5}" cy="${cy + 5}" r="2.4" fill="#fff"/></g>
        <g data-v="plead"><circle cx="${cx}" cy="${cy}" r="17" fill="${IRIS}"/><circle cx="${cx}" cy="${cy + 7}" r="9" fill="#2C4C8C" opacity=".55"/>
          <circle cx="${cx + 5}" cy="${cy - 6}" r="6.5" fill="#fff"/><circle cx="${cx - 6}" cy="${cy + 5}" r="3" fill="#fff"/><circle cx="${cx + 7}" cy="${cy + 6}" r="1.8" fill="#fff"/>
          <path d="M${cx - 11} ${cy + 10}Q${cx} ${cy + 16} ${cx + 11} ${cy + 10}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".55"/></g>
        <g data-v="star"><path class="l-star" style="${o}" d="${starPath(cx, cy, 17, 7.5)}" fill="#FFD43B" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="${cx - 3}" cy="${cy - 4}" r="2.4" fill="#fff"/></g>
        <g data-v="spiral"><circle cx="${cx}" cy="${cy}" r="15" fill="#fff" stroke="${OUT}" stroke-width="2.5"/><path class="l-spiral" style="${o}" d="${spiralPath(cx, cy)}" fill="none" stroke="${IRIS}" stroke-width="2.6" stroke-linecap="round"/></g>
        <path data-v="sleep" d="M${cx - 12} ${cy}Q${cx} ${cy + 10} ${cx + 12} ${cy}" fill="none" stroke="${OUT}" stroke-width="4" stroke-linecap="round"/>
        <path data-v="joy" d="M${cx - 12} ${cy + 4}Q${cx} ${cy - 10} ${cx + 12} ${cy + 4}" fill="none" stroke="${OUT}" stroke-width="4" stroke-linecap="round"/>
      </g>
      <g class="l-lidg" clip-path="url(#${p}e${side})"><rect class="l-lid" x="${cx - 18}" y="${cy - 50}" width="36" height="34" style="fill:var(--lm)" stroke="${OUT}" stroke-width="3"/></g>
    </g>`;
  }
  const MOUTHS = `
    <g data-v="smile"><path d="M107 156Q120 176 133 156Q120 161 107 156Z" fill="${IRIS}" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/><path d="M113 163Q120 159 127 163Q120 168.5 113 163Z" fill="${TONGUE}"/></g>
    <g data-v="grin"><path d="M102 153Q120 184 138 153Q120 159 102 153Z" fill="${IRIS}" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/><path d="M110 164Q120 158 130 164Q120 171 110 164Z" fill="${TONGUE}"/></g>
    <path data-v="content" d="M109 157Q120 166 131 157" fill="none" stroke="${OUT}" stroke-width="3.5" stroke-linecap="round"/>
    <ellipse data-v="o" cx="120" cy="161" rx="5" ry="6" fill="${IRIS}" stroke="${OUT}" stroke-width="2.5"/>
    <g data-v="bigO"><ellipse cx="120" cy="162" rx="10" ry="12" fill="${IRIS}" stroke="${OUT}" stroke-width="2.5"/><ellipse cx="120" cy="168.5" rx="6" ry="3.5" fill="${TONGUE}"/></g>
    <path data-v="wobble" d="M106 161q3.5-4 7 0t7 0t7 0t7 0" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path data-v="sheepish" d="M108 160Q117 165 132 155" fill="none" stroke="${OUT}" stroke-width="3.5" stroke-linecap="round"/>
    <path data-v="chomp" d="M106 159Q120 164 134 159" fill="none" stroke="${OUT}" stroke-width="4" stroke-linecap="round"/>
    <ellipse data-v="tiny" cx="120" cy="160" rx="3.5" ry="4.2" fill="${IRIS}"/>`;

  function buildSVG(p) {
    return `<svg viewBox="-10 -10 260 280" role="img" aria-label="Lula the squid">
<defs>
  <radialGradient id="${p}b" cx=".36" cy=".3" r=".8"><stop offset="0" style="stop-color:var(--lh)"/><stop offset=".5" style="stop-color:var(--lm)"/><stop offset="1" style="stop-color:var(--ll)"/></radialGradient>
  <linearGradient id="${p}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--lm)"/><stop offset="1" style="stop-color:var(--ll)"/></linearGradient>
  <clipPath id="${p}c"><path d="${BODY}"/></clipPath>
  <clipPath id="${p}e0"><circle cx="96" cy="134" r="16"/></clipPath>
  <clipPath id="${p}e1"><circle cx="144" cy="134" r="16"/></clipPath>
</defs>
<ellipse class="l-shadow" cx="120" cy="254" rx="72" ry="9" style="fill:var(--lshadow,#8ACFEF)"/>
<g class="l-float"><g class="l-squash">
  <g class="l-tents">${[0, 1, 2, 3, 4, 5].map((i) => tentacle(i, p)).join('')}</g>
  <g class="l-puff">
    <path class="l-fin-l" d="${FINL}" style="fill:url(#${p}b)" stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round"/>
    <path class="l-fin-r" d="${FINR}" style="fill:url(#${p}t)" stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="${BODY}" style="fill:url(#${p}b)"/>
    <g clip-path="url(#${p}c)">
      <path d="M150 18C192 70 196 150 150 192L250 192L250 0Z" style="fill:var(--ll)" opacity=".7"/>
      <ellipse cx="120" cy="192" rx="66" ry="20" style="fill:var(--ll)" opacity=".5"/>
    </g>
    <path d="${BODY}" fill="none" stroke="${OUT}" stroke-width="3.5" stroke-linejoin="round"/>
    <ellipse cx="94" cy="76" rx="8" ry="19" transform="rotate(24 94 76)" fill="#fff" opacity=".55"/>
    <ellipse cx="105" cy="44" rx="4.5" ry="7" transform="rotate(24 105 44)" fill="#fff" opacity=".6"/>
    <ellipse cx="153" cy="88" rx="4" ry="13" transform="rotate(-14 153 88)" fill="#fff" opacity=".3"/>
    <ellipse cx="80" cy="102" rx="3" ry="6" transform="rotate(20 80 102)" fill="#fff" opacity=".35"/>
    <g class="l-face">
      <ellipse class="l-cheek" cx="76" cy="153" rx="10" ry="6" fill="${BLUSH}" style="transform-box:fill-box;transform-origin:center"/>
      <ellipse class="l-cheek" cx="164" cy="153" rx="10" ry="6" fill="${BLUSH}" style="transform-box:fill-box;transform-origin:center"/>
      <ellipse cx="120" cy="146" rx="4.5" ry="2.6" style="fill:var(--ll)"/>
      ${eye(0, p)}${eye(1, p)}
      <g class="l-mouth">${MOUTHS}</g>
      <path class="l-sweat" d="M178 92C173 101 172 106 178 108C184 106 183 101 178 92Z" fill="#E6FBFF" stroke="${OUT}" stroke-width="2.2" style="display:none"/>
    </g>
    <g class="l-cap" style="display:none">
      <path d="M150 63C151 36 140 16 122 10C102 5 80 18 62 40C80 34 92 44 90 63C108 57 132 57 150 63Z" fill="#FF8A3D" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="112" cy="40" r="3" fill="#FFD43B"/><circle cx="134" cy="30" r="2.6" fill="#FFD43B"/><circle cx="130" cy="50" r="2.2" fill="#FFD43B"/><circle cx="92" cy="30" r="2.2" fill="#FFD43B"/>
      <path d="M84 68C100 56 140 56 156 68L153 79C138 69 102 69 87 79Z" fill="#fff" stroke="${OUT}" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="60" cy="42" r="10" fill="#fff" stroke="${OUT}" stroke-width="3"/>
    </g>
  </g>
</g></g>
<g class="l-ink"></g>
</svg><div class="l-fx"></div>`;
  }

  /* ---------- styles (injected once) ---------- */
  const MOTION_SEL = ['.l-float', '.l-shadow', '.l-wave', '.l-fin-l', '.l-fin-r', '.l-star', '.l-spiral', '.l-sweat'];
  const CSS = `
.lula{position:relative;width:100%;aspect-ratio:260/280;container-type:inline-size;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;touch-action:manipulation;cursor:pointer;--lh:#8FCDFF;--lm:#3E95FF;--ll:#2369E0}
.lula>svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;display:block}
.lula .l-fx{position:absolute;inset:0;pointer-events:none;overflow:visible}
.lula .l-float{animation:l-bob var(--bob,3s) ease-in-out infinite}
.lula .l-shadow{transform-origin:120px 254px;opacity:.55;animation:l-shadow var(--bob,3s) ease-in-out infinite}
.lula .l-squash{transform-origin:120px 150px}
.lula .l-puff{transform-origin:120px 150px;transition:transform .8s cubic-bezier(.34,1.56,.64,1)}
.lula .l-pose{transition:transform .7s cubic-bezier(.34,1.56,.64,1)}
.lula .l-wave{animation:l-wave var(--wd,2.4s) ease-in-out infinite alternate}
.lula .l-wave.l-tap{animation:l-tap .5s ease-in-out infinite}
.lula .l-fin-l{transform-origin:106px 50px;animation:l-finl 1.8s ease-in-out infinite alternate}
.lula .l-fin-r{transform-origin:134px 50px;animation:l-finr 1.8s ease-in-out infinite alternate}
.lula .l-look{transition:transform .35s cubic-bezier(.34,1.56,.64,1)}
.lula .l-lid{transition:transform .3s ease}
.lula .l-cheek{transition:opacity .6s}
.lula stop{transition:stop-color .9s}
.lula .l-star{animation:l-twinkle .7s ease-in-out infinite alternate}
.lula .l-spiral{animation:l-spin 1.1s linear infinite}
.lula .l-sweat{animation:l-sweat 2.4s ease-in infinite}
.lula.paused,.lula.paused *{animation-play-state:paused!important}
.lula .l-p{position:absolute;left:0;top:0;line-height:1;pointer-events:none;will-change:transform,opacity;white-space:nowrap}
.lula .l-txt{font:900 10cqw/1 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;color:#fff;-webkit-text-stroke:.9cqw ${OUT};paint-order:stroke fill}
.lula .l-emo{font-size:9cqw}
.lula .l-food{font-size:15cqw}
.lula .l-bub{border-radius:50%;border:.7cqw solid rgba(255,255,255,.9);background:radial-gradient(circle at 32% 30%,#fff 0 16%,rgba(255,255,255,.2) 19%)}
.lula .l-say{position:absolute;left:50%;bottom:90%;transform:translateX(-50%);transform-origin:50% 100%;width:max-content;max-width:min(260px,110cqw);z-index:3;background:#fff;color:#0D2B6B;border:3px solid ${OUT};border-radius:18px;padding:.55em .85em;font:700 clamp(12px,5cqw,17px)/1.25 ui-rounded,"SF Pro Rounded",system-ui,sans-serif;text-align:center;box-shadow:0 4px 0 rgba(13,43,107,.2);pointer-events:none;text-wrap:pretty}
.lula .l-say::after{content:"";position:absolute;left:50%;bottom:-9px;width:14px;height:14px;background:#fff;border-right:3px solid ${OUT};border-bottom:3px solid ${OUT};transform:translateX(-50%) rotate(45deg)}
@keyframes l-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(calc(var(--bobA,8px) * -1))}}
@keyframes l-shadow{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(.8);opacity:.32}}
@keyframes l-wave{from{transform:rotate(calc(var(--amp,8deg) * -1))}to{transform:rotate(var(--amp,8deg))}}
@keyframes l-tap{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-18deg)}}
@keyframes l-finl{from{transform:rotate(-6deg)}to{transform:rotate(5deg)}}
@keyframes l-finr{from{transform:rotate(6deg)}to{transform:rotate(-5deg)}}
@keyframes l-twinkle{from{transform:scale(.88) rotate(-8deg)}to{transform:scale(1.08) rotate(8deg)}}
@keyframes l-spin{to{transform:rotate(360deg)}}
@keyframes l-sweat{0%{transform:translateY(-4px);opacity:0}20%,80%{opacity:1}100%{transform:translateY(14px);opacity:0}}
${MOTION_SEL.map((s) => '.lula.l-reduced ' + s).join(',')}{animation:none!important}
.lula.l-reduced .l-pose,.lula.l-reduced .l-puff{transition-duration:.4s;transition-timing-function:ease}
@media (prefers-reduced-motion:reduce){${MOTION_SEL.map((s) => '.lula ' + s).join(',')}{animation:none!important}}`;
  function injectCSS() {
    if (document.getElementById('lula-css')) return;
    const s = document.createElement('style');
    s.id = 'lula-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------- sound (Web Audio, no files; off by default) ---------- */
  const SFX = {
    enabled: false, ctx: null,
    _c() {
      if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; this.ctx = new AC(); }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },
    tone(f1, f2, dur, type = 'sine', vol = 0.18, delay = 0) {
      const c = this._c(); if (!c) return;
      const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    },
    noise(dur, freq, vol = 0.25, delay = 0) {
      const c = this._c(); if (!c) return;
      const t = c.currentTime + delay, b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8; g.gain.value = vol;
      s.connect(f).connect(g).connect(c.destination); s.start(t);
    },
    play(n) {
      if (!this.enabled) return;
      try {
        ({
          blip: () => this.tone(620, 980, 0.09, 'square', 0.05),
          pop: () => this.tone(380, 900, 0.07, 'sine', 0.2),
          chomp: () => { this.tone(220, 90, 0.09, 'triangle', 0.3); this.noise(0.06, 900, 0.15); },
          pfft: () => this.noise(0.35, 1400, 0.35),
          whoosh: () => this.tone(260, 760, 0.28, 'sine', 0.1),
          tada: () => [523, 659, 784, 1046].forEach((f, i) => this.tone(f, f * 1.01, 0.16, 'triangle', 0.14, i * 0.09)),
        }[n] || (() => {}))();
      } catch (e) { /* audio is optional */ }
    },
  };

  /* ---------- the rig ---------- */
  let count = 0;
  class LulaRig {
    constructor(host, opts = {}) {
      injectCSS();
      this.opts = opts;
      this.reduced = opts.reduced ?? mq.matches;
      const p = 'lula' + ++count;
      const root = document.createElement('div');
      root.className = 'lula' + (this.reduced ? ' l-reduced' : '');
      root.innerHTML = buildSVG(p);
      host.appendChild(root);
      this.el = root;
      const q = (s) => root.querySelector(s), qa = (s) => [...root.querySelectorAll(s)];
      this.svg = q('svg'); this.fx = q('.l-fx'); this.squash = q('.l-squash'); this.puffG = q('.l-puff'); this.inkL = q('.l-ink');
      this.eyes = qa('.l-eye'); this.looks = qa('.l-look'); this.lids = qa('.l-lid'); this.lidGs = qa('.l-lidg');
      this.mouth = q('.l-mouth'); this.cheeks = qa('.l-cheek'); this.poses = qa('.l-pose'); this.waves = qa('.l-wave');
      this.sweat = q('.l-sweat'); this.cap = q('.l-cap'); this.watch = q('.l-watch');
      this.timers = new Set(); this.taps = []; this.hidden = document.hidden; this.offscreen = false;
      if (opts.shadow) root.style.setProperty('--lshadow', opts.shadow);
      this._tap = (e) => this.tap(e);
      root.addEventListener('pointerdown', this._tap);
      this._vis = () => { this.hidden = document.hidden; this.syncPause(); };
      document.addEventListener('visibilitychange', this._vis);
      if ('IntersectionObserver' in window) {
        this.io = new IntersectionObserver(([en]) => { this.offscreen = !en.isIntersecting; this.syncPause(); });
        this.io.observe(root);
      }
      this.setMood(opts.mood || 'cruising', true);
      this.scheduleBlink(); this.scheduleLook();
    }
    syncPause() { this.paused = this.hidden || this.offscreen; this.el.classList.toggle('paused', this.paused); }
    after(ms, fn) { const id = setTimeout(() => { this.timers.delete(id); fn(); }, ms); this.timers.add(id); return id; }
    map(vx, vy) { return [((vx + 10) / 260) * this.el.clientWidth, ((vy + 10) / 280) * this.el.clientHeight]; }
    move(el, frames, opts) {
      if (this.reduced) return el.animate([{ opacity: 1 }, { opacity: 0.72 }, { opacity: 1 }], { duration: Math.min(opts.duration, 600) });
      return el.animate(frames, opts);
    }
    variant(group, name) { group.querySelectorAll(':scope > [data-v], :scope > .l-look > [data-v]').forEach((c) => { c.style.display = c.dataset.v === name ? '' : 'none'; }); }

    /* face parts */
    setEyes(name) {
      this.eyesV = name;
      this.eyes.forEach((e) => this.variant(e, name));
      const lids = name === 'open' || name === 'plead';
      this.lidGs.forEach((g) => { g.style.display = lids ? '' : 'none'; });
    }
    setMouth(name) { this.variant(this.mouth, name); }
    setLook(x, y) { this.looks.forEach((l) => { l.style.transform = `translate(${x}px,${y}px)`; }); }
    restoreLook() { const [x, y] = this.cfg.look || [0, 0]; this.setLook(x, y); }
    setLid(k) { this.lidK = k; this.lids.forEach((l) => { l.style.transform = `translateY(${k * 32}px)`; }); }
    restoreFace() { this.setEyes(this.cfg.eyes); this.setMouth(this.cfg.mouth); }

    setMood(m, initial) {
      const cfg = MOODS[m] || MOODS.cruising;
      this.mood = MOODS[m] ? m : 'cruising'; this.cfg = cfg; this.el.dataset.mood = this.mood;
      const s = this.el.style;
      s.setProperty('--lh', cfg.tint[0]); s.setProperty('--lm', cfg.tint[1]); s.setProperty('--ll', cfg.tint[2]);
      s.setProperty('--amp', cfg.amp + 'deg'); s.setProperty('--wd', cfg.wd + 's');
      s.setProperty('--bob', cfg.bob + 's'); s.setProperty('--bobA', cfg.bobA + 'px');
      this.restoreFace();
      this.cheeks.forEach((c) => { c.style.opacity = cfg.blush; });
      POSES[cfg.pose].forEach((a, i) => { this.poses[i].style.transform = `rotate(${a}deg)`; });
      this.waves[4].classList.toggle('l-tap', !!cfg.watch);
      this.watch.style.display = cfg.watch ? '' : 'none';
      const [sx, sy] = cfg.puff || [1, 1];
      this.puffG.style.transform = `scale(${sx},${sy})`;
      this.sweat.style.display = cfg.sweat ? '' : 'none';
      this.cap.style.display = cfg.cap ? '' : 'none';
      this.restoreLook(); this.setLid(cfg.lid || 0);
      if (!initial) {
        this.move(this.squash, [{ transform: 'scale(1)' }, { transform: 'scale(1.08,.9)' }, { transform: 'scale(.95,1.06)' }, { transform: 'scale(1)' }], { duration: 500, easing: 'ease-out' });
        if (this.mood === 'target') this.celebrate();
      }
      this.startLoop();
    }
    startLoop() {
      clearTimeout(this.loopT);
      const L = LOOPS[this.mood]; if (!L) return;
      const tick = () => {
        if (!this.paused && !this.busy) L.fn.call(this);
        this.loopT = setTimeout(tick, L.every * rand(0.8, 1.2));
      };
      this.loopT = setTimeout(tick, L.first ?? 1200);
    }
    scheduleBlink() {
      this.after(rand(2200, 5200), () => {
        if (!this.paused) { this.blink(); if (Math.random() < 0.2) this.after(260, () => this.blink()); }
        this.scheduleBlink();
      });
    }
    blink() {
      if (this.eyesV !== 'open' && this.eyesV !== 'plead') return;
      const b = `translateY(${(this.lidK || 0) * 32}px)`;
      this.lids.forEach((l) => l.animate([{ transform: b }, { transform: 'translateY(32px)', offset: 0.5 }, { transform: b }], { duration: this.cfg.slowBlink ? 460 : 170, easing: 'ease-in-out' }));
    }
    scheduleLook() {
      this.after(rand(3500, 7000), () => {
        if (!this.paused && !this.cfg.look && !this.holdLook && (this.eyesV === 'open' || this.eyesV === 'plead')) {
          this.setLook(rand(-4, 4), rand(-3, 2));
          this.after(1300, () => { if (!this.holdLook) this.restoreLook(); });
        }
        this.scheduleLook();
      });
    }
    lookAt(x, y) {
      const r = this.svg.getBoundingClientRect();
      const dx = x - (r.left + r.width * (130 / 260)), dy = y - (r.top + r.height * (144 / 280)), d = Math.hypot(dx, dy) || 1;
      this.setLook((dx / d) * 4.5, (dy / d) * 3.5);
      this.holdLook = true; clearTimeout(this.lookT);
      this.lookT = setTimeout(() => { this.holdLook = false; this.restoreLook(); }, 1600);
    }

    /* particles */
    spawn(cls, text, vx, vy, path, dur = 1400, ease = 'ease-out', size) {
      if (this.paused) return;
      const el = document.createElement('span');
      el.className = 'l-p ' + cls;
      if (text) el.textContent = text;
      if (size) { el.style.width = size + 'cqw'; el.style.height = size + 'cqw'; }
      this.fx.appendChild(el);
      const [x, y] = this.map(vx, vy), u = this.el.clientWidth / 100;
      let kf = path.map((k) => {
        const f = { transform: `translate(${x + (k.x || 0) * u}px,${y + (k.y || 0) * u}px) translate(-50%,-50%) scale(${k.s ?? 1}) rotate(${k.r || 0}deg)`, opacity: k.o ?? 1 };
        if (k.offset !== undefined) f.offset = k.offset;
        return f;
      });
      if (this.reduced) kf = [{ transform: kf[1]?.transform || kf[0].transform, opacity: 0 }, { transform: kf[1]?.transform || kf[0].transform, opacity: 1, offset: 0.3 }, { transform: kf[1]?.transform || kf[0].transform, opacity: 0 }];
      const a = el.animate(kf, { duration: dur, easing: ease, fill: 'forwards' });
      a.onfinish = () => el.remove();
    }
    rise(txt, vx, vy, cls = 'l-txt', drift = 0) {
      this.spawn(cls, txt, vx, vy, [{ s: 0.4, o: 0 }, { offset: 0.2, s: 1, o: 1 }, { x: drift, y: -26, s: 1.05, o: 0 }], 1900);
    }
    bubbles(n, vx, vy) {
      for (let i = 0; i < n; i++) this.after(i * 90, () => {
        this.spawn('l-bub', '', vx + rand(-10, 10), vy, [{ s: 0.3, o: 0 }, { offset: 0.15, s: 1, o: 1 }, { x: rand(-12, 12), y: -rand(40, 70), s: 1.1, o: 0 }], rand(1400, 2200), 'ease-out', rand(3, 7));
        SFX.play('pop');
      });
    }
    confetti(n) {
      const items = ['🐟', '⭐', '🐠', '✨', '⭐', '🐟'];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand(-0.3, 0.3), dx = Math.cos(a) * rand(32, 58), dy = Math.sin(a) * rand(28, 50) - 10, r = rand(-200, 200);
        if (i % 3 === 2) this.spawn('l-bub', '', 120, 120, [{ s: 0.2, o: 0 }, { offset: 0.25, x: dx * 0.7, y: dy * 0.7, s: 1 }, { x: dx, y: dy - 20, s: 1.2, o: 0 }], 1500, 'cubic-bezier(.2,.8,.3,1)', rand(4, 7));
        else this.spawn('l-emo', items[i % items.length], 120, 120, [{ s: 0.2, o: 0 }, { offset: 0.25, x: dx * 0.7, y: dy * 0.7, s: 1, r: r * 0.5 }, { x: dx, y: dy + 22, s: 0.9, o: 0, r }], 1500, 'cubic-bezier(.2,.8,.3,1)');
      }
    }
    ink(big) {
      if (this.paused) return;
      const g = document.createElementNS(NS, 'g');
      const blobs = big ? [[0, 0, 26], [-24, 8, 18], [24, 6, 20], [-10, -16, 17], [14, -18, 16], [36, -8, 13], [-34, -6, 12]] : [[0, 0, 12], [-11, 4, 8], [11, 3, 9], [0, -9, 8]];
      g.innerHTML = blobs.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#3B2B57"/>`).join('') +
        blobs.slice(0, 3).map(([x, y, r]) => `<circle cx="${x - r * 0.3}" cy="${y - r * 0.35}" r="${r * 0.28}" fill="#6A5A8C"/>`).join('');
      this.inkL.appendChild(g);
      const [x0, y0] = big ? [172, 214] : [152, 198];
      const T = (x, y, s) => `translate(${x}px,${y}px) scale(${s})`;
      const kf = this.reduced
        ? [{ transform: T(x0, y0, 1), opacity: 0 }, { transform: T(x0, y0, 1), opacity: 0.85, offset: 0.3 }, { transform: T(x0, y0, 1), opacity: 0 }]
        : [{ transform: T(x0, y0, 0.15), opacity: 0.95 }, { transform: T(x0 + 6, y0 - 4, 1), opacity: 0.92, offset: 0.18 }, { transform: T(x0 + (big ? 50 : 20), y0 - (big ? 40 : 18), big ? 1.5 : 1.3), opacity: 0 }];
      const a = g.animate(kf, { duration: big ? 4200 : 1700, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
      a.onfinish = () => g.remove();
      this.rise(big ? 'PFFT!' : 'pfft', x0, y0 - (big ? 34 : 18));
      SFX.play('pfft');
      this.move(this.squash, [{ transform: 'translate(0,0)' }, { transform: 'translate(-4px,-6px)' }, { transform: 'translate(0,0)' }], { duration: 400, easing: 'ease-out' });
    }
    say(text, ms = 2800) {
      if (this.sayEl) this.sayEl.remove();
      const b = document.createElement('div');
      b.className = 'l-say'; b.textContent = text;
      this.el.appendChild(b); this.sayEl = b;
      b.animate(this.reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateX(-50%) translateY(10px) scale(.6)' }, { opacity: 1, transform: 'translateX(-50%) scale(1.06)', offset: 0.7 }, { opacity: 1, transform: 'translateX(-50%) scale(1)' }], { duration: 380, easing: 'ease-out' });
      this.after(ms, () => { const a = b.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }); a.onfinish = () => b.remove(); });
    }

    /* body gags */
    growl() {
      this.move(this.squash, [{ transform: 'scale(1)' }, { transform: 'scale(1.05,.96)' }, { transform: 'scale(.97,1.03)' }, { transform: 'scale(1.03,.98)' }, { transform: 'scale(1)' }], { duration: 600 });
      this.rise('grr', 120, 210, 'l-txt', 0);
    }
    hop() {
      this.move(this.squash, [{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(2px) scale(1.06,.94)', offset: 0.2 }, { transform: 'translateY(-16px) scale(.96,1.05)', offset: 0.5 }, { transform: 'translateY(0) scale(1.04,.96)', offset: 0.8 }, { transform: 'translateY(0) scale(1)' }], { duration: 700, easing: 'ease-out' });
    }
    shrug() {
      this.move(this.squash, [{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-6px) rotate(-3deg)' }, { transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-6px) rotate(3deg)' }, { transform: 'translateY(0) rotate(0)' }], { duration: 900 });
    }
    spin() {
      this.busy = true;
      this.move(this.squash, [{ transform: 'rotate(0deg) scale(1)' }, { transform: 'rotate(200deg) scale(.92,1.08)', offset: 0.55 }, { transform: 'rotate(360deg) scale(1)' }], { duration: 850, easing: 'ease-in-out' });
      SFX.play('whoosh');
      this.after(850, () => { this.busy = false; });
    }
    giggle() {
      this.busy = true; this.setEyes('joy'); this.setMouth('grin');
      this.move(this.squash, [{ transform: 'rotate(0)' }, { transform: 'rotate(-8deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(0)' }], { duration: 700 });
      SFX.play('blip'); this.after(140, () => SFX.play('blip'));
      this.after(900, () => { this.restoreFace(); this.busy = false; });
    }
    squirt() { this.bubbles(6, 120, 188); }
    joke() {
      this.setEyes('joy'); this.setMouth('smile');
      this.say(pick(JOKES), 3000);
      this.after(1200, () => this.restoreFace());
    }
    dizzy() {
      this.busy = true; this.setEyes('spiral'); this.setMouth('wobble');
      this.move(this.squash, [{ transform: 'rotate(0)' }, { transform: 'rotate(-12deg)' }, { transform: 'rotate(10deg)' }, { transform: 'rotate(-8deg)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(0)' }], { duration: 1600, easing: 'ease-in-out' });
      this.say('Whoa… so many taps 🌀', 2200);
      this.after(2400, () => { this.restoreFace(); this.busy = false; });
    }
    celebrate() { this.spin(); this.confetti(18); SFX.play('tada'); }

    tap(e) {
      e && e.stopPropagation && e.stopPropagation();
      const now = Date.now();
      this.taps = this.taps.filter((t) => now - t < 3500); this.taps.push(now);
      if (this.busy) return;
      SFX.play('blip');
      if (this.taps.length >= 6) { this.taps = []; this.dizzy(); return; }
      if (this.mood === 'night') {
        this.setEyes('open'); this.say(pick(SLEEPY), 2200);
        this.after(1100, () => this.restoreFace());
        return;
      }
      const opts = ['giggle', 'spin', 'squirt', 'joke'].filter((x) => x !== this.lastR);
      const r = pick(opts); this.lastR = r; this[r]();
      this.opts.onTap && this.opts.onTap(r);
    }
    chomp(n) {
      return new Promise((res) => {
        let i = 0;
        const step = () => {
          if (i >= n * 2) return res();
          this.setMouth(i % 2 ? 'bigO' : 'chomp');
          if (i % 2 === 0) {
            SFX.play('chomp');
            const b = this.cfg.blush;
            this.cheeks.forEach((c) => c.animate([{ transform: 'scale(1)', opacity: b }, { transform: 'scale(1.6,1.4)', opacity: 0.9 }, { transform: 'scale(1)', opacity: b }], { duration: 240 }));
            this.move(this.puffG, [{ transform: this.puffG.style.transform }, { transform: 'scale(1.06,.95)' }, { transform: this.puffG.style.transform }], { duration: 240 });
          }
          i++; setTimeout(step, 130);
        };
        step();
      });
    }
    feed(emoji = '🍽️', from) {
      return new Promise((res) => {
        const r = this.el.getBoundingClientRect(), w = r.width, h = r.height;
        const sx = from ? from.x - r.left : w * 0.5, sy = from ? from.y - r.top : h * 1.25;
        const [mx, my] = this.map(120, 160);
        const el = document.createElement('span');
        el.className = 'l-p l-food'; el.textContent = emoji; this.fx.appendChild(el);
        this.busy = true; this.setMouth('bigO'); if (this.cfg.eyes === 'sleep') this.setEyes('open');
        const T = (x, y, s, rot) => `translate(${x}px,${y}px) translate(-50%,-50%) scale(${s}) rotate(${rot}deg)`;
        const peak = Math.min(sy, my) - h * 0.3;
        const kf = this.reduced
          ? [{ transform: T(mx, my, 1, 0), opacity: 0 }, { transform: T(mx, my, 1, 0), opacity: 1, offset: 0.4 }, { transform: T(mx, my, 0.6, 0), opacity: 0 }]
          : [{ transform: T(sx, sy, 1.3, 0) }, { transform: T((sx + mx) / 2, peak, 1.1, 180), offset: 0.5 }, { transform: T(mx, my, 0.25, 360), opacity: 0.6 }];
        const a = el.animate(kf, { duration: this.reduced ? 600 : 820, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' });
        a.onfinish = () => {
          el.remove();
          this.chomp(3).then(() => {
            this.setEyes('joy'); this.setMouth('grin'); this.bubbles(3, 120, 178);
            this.after(800, () => { this.restoreFace(); this.busy = false; res(); });
          });
        };
      });
    }
    setShadow(c) { this.el.style.setProperty('--lshadow', c); }
    destroy() {
      this.timers.forEach(clearTimeout); clearTimeout(this.loopT); clearTimeout(this.lookT);
      document.removeEventListener('visibilitychange', this._vis);
      if (this.io) this.io.disconnect();
      this.el.remove();
    }
  }

  // Same thresholds as the app's quip buckets. Night (00:00–05:00) wins over everything.
  function moodFor(eaten, goal, n, date = new Date()) {
    if (date.getHours() < 5) return 'night';
    if (!n) return 'hungry';
    const p = eaten / goal;
    return p < 0.3 ? 'light' : p < 0.7 ? 'cruising' : p < 0.95 ? 'careful' : p <= 1 ? 'target' : p <= 1.15 ? 'over' : 'way';
  }
  const BUCKET = { hungry: 'empty', light: 'low', cruising: 'mid', careful: 'high', target: 'done', over: 'over', way: 'way', night: 'night' };

  window.Lula = { create: (host, opts) => new LulaRig(host, opts), MOODS, POSES, LOOPS, JOKES, BUCKET, moodFor, sfx: SFX };
})();
