/**
 * Vault Walk-Through Entry — Phased Sequence
 *
 * Phase 0 (click)      → Dialing   : dial spins, centre wheel races    (900 ms)
 * Phase 1 (+900 ms)    → Unlocking : 8 lock arms retract in cascade    (900 ms)
 * Phase 2 (+1 800 ms)  → Cracking  : seam blazes, pressure light swells (350 ms)
 * Phase 3 (+2 150 ms)  → Opening   : bolt bars slide, doors swing apart
 * Phase 4 (+2 550 ms)  → Walking   : camera rushes toward the light
 * Phase 5 (+3 350 ms)  → Gone      : blinding flash → fade to website
 * Phase 6 (+3 750 ms)  → DOM removed
 *
 * When .vault-locker or .vault-dial-wrap are absent (e.g. app.html),
 * the corresponding phase durations collapse to 0 and the door opens
 * immediately after click — preserving backward compatibility.
 */
(() => {
  const intro = document.querySelector('[data-vault-intro]');
  if (!intro) return;

  if (new URLSearchParams(window.location.search).has('skipIntro')) {
    intro.remove();
    document.body.classList.add('vault-unlocked');
    return;
  }

  const trigger   = intro.querySelector('.vault-core-hub, .vault-intro-logo');
  let   opened    = false;

  /* hasDial: true when the full luxury intro is present (core hub exists).
   * Falls back gracefully for simplified intros without the hub. */
  const hasDial   = !!intro.querySelector('.vault-core-hub');
  const hasLocker = !!intro.querySelector('.vault-locker');

  const DIAL_MS   = hasDial   ? 900 : 0;
  const UNLOCK_MS = hasLocker ? 900 : 0;
  const CRACK_MS  = hasLocker ? 350 : 0;
  const SEQ_OFFSET = DIAL_MS + UNLOCK_MS + CRACK_MS; /* ms until door swings */

  /* ── Synthetic vault sounds ─────────────────────────────────────────────── */
  function playVaultSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();

      const noise = (dur, decay, vol, t = 0) => {
        const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++)
          d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * decay));
        const src = ctx.createBufferSource();
        const g   = ctx.createGain();
        g.gain.setValueAtTime(vol, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + dur);
        src.buffer = buf; src.connect(g); g.connect(ctx.destination);
        src.start(ctx.currentTime + t);
      };

      const tone = (freq, dur, vol, t = 0) => {
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(vol, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + dur);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime  + t + dur + 0.05);
      };

      /* Phase 0 — combination dial clicks (7 descending ticks) */
      if (hasDial) {
        for (let i = 0; i < 7; i++) {
          const t = i * 0.115;
          noise(0.030, 0.007, 0.16, t);
          tone(880 - i * 25, 0.024, 0.032, t + 0.004);
        }
      }

      /* Phase 1 — 8 metal arm retraction clunks, staggered */
      if (hasLocker) {
        const u0 = DIAL_MS / 1000;
        for (let i = 0; i < 8; i++) {
          noise(0.048, 0.009, 0.18, u0 + i * 0.098);
          tone(210 - i * 9, 0.036, 0.038, u0 + i * 0.098 + 0.005);
        }

        /* Phase 2 — deep resonant crack as pressure releases at the seam */
        const c0 = (DIAL_MS + UNLOCK_MS) / 1000;
        noise(0.200, 0.050, 0.40, c0);
        tone(58, 0.150, 0.090, c0 + 0.010);
      }

      /* Phase 3 — heavy door mechanism: bolt retraction clunk + door thunk */
      const o0 = SEQ_OFFSET / 1000;
      noise(0.075, 0.012, 0.28, o0 + 0.02);
      tone(145,  0.055, 0.055, o0 + 0.03);
      noise(0.22,  0.056, 0.44, o0 + 0.13);
      tone( 55,  0.160, 0.085, o0 + 0.14);

      /* Phase 4 — deep door-swing rumble + whoosh of passing through */
      noise(0.72, 0.210, 0.20, o0 + 0.38);
      noise(0.55, 0.380, 0.13, o0 + 0.40);

    } catch (_) { /* AudioContext unavailable — silent fallback */ }
  }

  /* ── Open sequence ──────────────────────────────────────────────────────── */
  const openVault = () => {
    if (opened) return;
    opened = true;
    playVaultSound();
    document.body.classList.add('vault-unlocked');

    /* Phase 0 — Dialing */
    if (hasDial) intro.classList.add('is-dialing');

    if (hasLocker) {
      /* Phase 1 — Unlocking (arms retract) */
      window.setTimeout(() => {
        intro.classList.remove('is-dialing');
        intro.classList.add('is-unlocking');
      }, DIAL_MS);

      /* Phase 2 — Cracking (seam glows, light swells) */
      window.setTimeout(() => {
        intro.classList.add('is-cracking');
      }, DIAL_MS + UNLOCK_MS);
    } else if (hasDial) {
      window.setTimeout(() => intro.classList.remove('is-dialing'), DIAL_MS);
    }

    /* Phase 3 — Opening (bolt bars retract, doors swing) */
    window.setTimeout(() => intro.classList.add('is-opening'), SEQ_OFFSET);

    /* Phase 4 — Walking (camera rush) */
    window.setTimeout(() => intro.classList.add('is-walking'), SEQ_OFFSET + 400);

    /* Phase 5 — Gone */
    window.setTimeout(() => intro.classList.add('is-gone'), SEQ_OFFSET + 1200);

    /* Phase 6 — DOM cleanup */
    window.setTimeout(() => intro.remove(), SEQ_OFFSET + 1700);
  };

  /* Vault materialises after a short dramatic pause */
  window.setTimeout(() => intro.classList.add('is-ready'), 180);

  trigger.addEventListener('click', openVault);
  trigger.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openVault(); }
  });
})();
