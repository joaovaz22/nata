# Nata × Lula: what's where

Copy everything in this folder to the repo root (index.html, styles.css, app.js, lula.js, sw.js, manifest.webmanifest, icons/).
Data stays in `localStorage["nata-v1"]` with the same structure. Sound and theme are kept separately in `nata-prefs`.
When you change any file, bump `CACHE` in `sw.js` so installed phones update.

## Lula's moods (lula.js)
| Mood | Trigger | Look | Looping gag |
|---|---|---|---|
| hungry | nothing logged | pale blue, pleading eyes, "o" mouth, wears a watch | tummy growl / "?" bubble, taps his watch |
| light | < 30 % | periwinkle, happy smile, big tentacle swing | hops, bubble squirts |
| cruising | 30–70 % | default blue, content smile, slow blinks | ♪ notes |
| careful | 70–95 % | side-eye, half lids, wobbly mouth, sweat drop, crossed tentacles | nervous glances |
| target | 95–100 % | star eyes, grin, arms up | spins + fish/star/bubble confetti |
| over | 100–115 % | violet flush, blushing, sheepish smile | shrug + small ink "pfft" |
| way | > 115 % | puffed up, spiral eyes, big "O" | big drifting ink cloud |
| night | 00:00–05:00 | nightcap, closed eyes, slow bob | Zzz |

Tap reactions: giggle, spin, bubble squirt, joke. Six taps in 3.5 s makes him dizzy. When you tap the screen, his eyes follow.
API: `Lula.create(el, {mood})` → `.setMood() .tap() .feed(emoji) .celebrate() .ink(big) .say(text) .lookAt(x, y) .destroy()`.

## Where to tweak
- **lula.js → `MOODS`**: per-mood tint `[highlight, mid, shade]`, eyes, mouth, pose, `amp` (tentacle swing °), `wd` (swing speed), `bob`/`bobA` (float speed/height), `look`, `lid`, `puff`.
- **lula.js → `POSES`**: six tentacle angles per pose. **`LOOPS`**: each mood's gag and how often it runs (ms). **`JOKES`**, **`SLEEPY`**: tap lines.
- **lula.js → `CSS`**: keyframes for bob, tentacle wave, fins, star/spiral eyes, sweat.
- **lula.js → `SFX`**: Web Audio blip/pop/chomp/pfft/whoosh/tada (off by default, toggled in More).
- **app.js → `QUIPS`**: speech-bubble lines per bucket (the bucket → mood map is `MOOD_OF`). `CELEBRATE_WITHIN` = the ±5 % goal celebration.
- **app.js → `feedAndShow` / `afterLog`**: the "Eat it!" flow (fly emoji → chomp → number rolls → toast → celebrations).
- **styles.css → `:root`**: light palette, then the "deep sea" dark palette. `--spring` is the shared overshoot easing.

## Motion rules
- Only transform and opacity are animated (the ring's stroke offset is the one exception, and it only repaints).
- Lula pauses when the app is hidden or he's off screen. `body.paused` pauses every CSS animation.
- With `prefers-reduced-motion`, big movement becomes fades. Mood changes (tint, face, pose) still happen.
