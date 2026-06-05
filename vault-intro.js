/**
 * Vault Walk-Through Entry - Enhanced
 *
 * Phase 0 (click)    → Dialing: combination dial spins 3 counter-clockwise turns
 *                       while 7 mechanical click-tones play
 *                       (skipped automatically on app page - no dial elements)
 * Phase 1 (+700ms)   → Opening: bolt bars slide right, seam blazes gold,
 *                       doors swing apart on hinges
 * Phase 2 (+1100ms)  → Walk-through: camera rushes toward the light
 * Phase 3 (+1900ms)  → Blinding flash → fade to website
 * Phase 4 (+2400ms)  → Element removed from DOM
 */
(() => {
  const intro   = document.querySelector('[data-vault-intro]');
  if (!intro) return;

  if (new URLSearchParams(window.location.search).has('skipIntro')) {
    intro.remove();
    document.body.classList.add('vault-unlocked');
    return;
  }

  const trigger = intro.querySelector('.vault-intro-logo');
  let   opened  = false;

  /* Detect whether this is the full intro (with dial) or the simplified app intro */
  const hasDial     = !!intro.querySelector('.vault-dial-wrap');
  const dialDelay   = hasDial ? 700 : 0;   /* ms to spend in the dialing phase */

  /* ── Synthetic vault sound ─────────────────────────────────────────────── */
  function playVaultSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();

      /* Shaped noise burst */
      const noise = (dur, decay, vol, startAt = 0) => {
        const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++)
          d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * decay));
        const src = ctx.createBufferSource();
        const g   = ctx.createGain();
        g.gain.setValueAtTime(vol, ctx.currentTime + startAt);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startAt + dur);
        src.buffer = buf; src.connect(g); g.connect(ctx.destination);
        src.start(ctx.currentTime + startAt);
      };

      /* Pure sine-wave tone */
      const tone = (freq, dur, vol, startAt = 0) => {
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(vol, ctx.currentTime + startAt);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startAt + dur);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(ctx.currentTime + startAt);
        osc.stop(ctx.currentTime  + startAt + dur + 0.05);
      };

      if (hasDial) {
        /* - Phase 0: combination dial clicks (7 ticks, slightly descending pitch) - */
        for (let i = 0; i < 7; i++) {
          const t = i * 0.092;
          noise(0.030, 0.007, 0.16, t);
          tone(880 - i * 25, 0.024, 0.032, t + 0.004);
        }
      }

      /* - Phase 1: bolt retraction clunk - */
      noise(0.075, 0.012, 0.28, dialDelay / 1000 + 0.02);
      tone(145, 0.055, 0.055, dialDelay / 1000 + 0.03);

      /* - Phase 1: heavy door-mechanism thunk - */
      noise(0.22, 0.056, 0.44, dialDelay / 1000 + 0.13);
      tone( 55, 0.160, 0.085, dialDelay / 1000 + 0.14);

      /* - Phase 2: deep door-swing rumble - */
      noise(0.72, 0.210, 0.20, dialDelay / 1000 + 0.38);

      /* - Phase 2: whoosh of passing through the opening - */
      noise(0.55, 0.380, 0.13, dialDelay / 1000 + 0.40);

    } catch (_) { /* audio context unavailable - silent fallback */ }
  }

  /* ── Open sequence ─────────────────────────────────────────────────────── */
  const openVault = () => {
    if (opened) return;
    opened = true;

    playVaultSound();
    document.body.classList.add('vault-unlocked');

    if (hasDial) {
      /* Phase 0 - Dialing: dial spins, logo dims slightly */
      intro.classList.add('is-dialing');
      window.setTimeout(() => {
        intro.classList.remove('is-dialing');
        intro.classList.add('is-opening');
      }, dialDelay);
    } else {
      /* No dial - open immediately */
      intro.classList.add('is-opening');
    }

    /* Phase 2 - Walk-through */
    window.setTimeout(() => intro.classList.add('is-walking'),  dialDelay + 400);

    /* Phase 3 - Gone */
    window.setTimeout(() => intro.classList.add('is-gone'),     dialDelay + 1200);

    /* Clean up DOM */
    window.setTimeout(() => intro.remove(),                     dialDelay + 1700);
  };

  /* Logo materialises after a short dramatic pause in the dark */
  window.setTimeout(() => intro.classList.add('is-ready'), 180);

  /* Triggers */
  trigger.addEventListener('click', openVault);
  trigger.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openVault(); }
  });
})();
