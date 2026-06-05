/**
 * Vault website - scroll entrance, stats counters, hero parallax, active nav
 * Only loaded on index.html (not the app or admin pages).
 */
(() => {
  /* ── Easing helper ───────────────────────────────────────────────────── */
  const easeOut = t => 1 - (1 - t) ** 3;

  /* ── Scroll entrance observer ────────────────────────────────────────── */

  /*
   * Selectors and their per-item stagger (ms per index within that group).
   * Only elements NOT already in the viewport get the .will-animate hidden state.
   */
  const GROUPS = [
    /* --- Website new sections --- */
    { sel: '.invest-header > *',          stagger: 90  },
    { sel: '.method-card',                stagger: 80  },
    { sel: '.rate-callout',               stagger: 0   },
    { sel: '.invest-table-wrap',          stagger: 0   },
    { sel: '.invest-cta-bar',             stagger: 0   },
    { sel: '.partners-header > *',        stagger: 80  },
    { sel: '.partner-logo-strip',         stagger: 0   },
    { sel: '.partner-card',               stagger: 100 },
    { sel: '.compliance-section',         stagger: 0   },
    { sel: '.compliance-badge-row',       stagger: 0   },
    { sel: '.partners-quote',             stagger: 0   },
    { sel: '.stakeholders-header > *',    stagger: 80  },
    { sel: '.team-card',                  stagger: 72  },
    { sel: '.advisory-strip',             stagger: 0   },
    { sel: '.mission-callout',            stagger: 0   },
    { sel: '.connect-header > *',         stagger: 80  },
    { sel: '.tier-card',                  stagger: 90  },
    { sel: '.connect-trust-row',          stagger: 0   },
    { sel: '.connect-dir-header > *',     stagger: 80  },
    { sel: '.advisor-card',               stagger: 80  },
    { sel: '.education-header > *',       stagger: 80  },
    { sel: '.edu-card',                   stagger: 80  },
    { sel: '.connect-cta-bar',            stagger: 0   },
    { sel: '.connect-quote',              stagger: 0   },
    /* --- Existing website sections --- */
    { sel: '.intro h2, .intro p',         stagger: 80  },
    { sel: '.feature-grid article',       stagger: 60  },
    { sel: '.stats-strip .stat-block',    stagger: 80  },
    { sel: '.card-section h2',            stagger: 0   },
    { sel: '.card-section p',             stagger: 80  },
    { sel: '.card-section .button',       stagger: 0   },
    { sel: '.database-section h2',        stagger: 0   },
    { sel: '.database-grid article',      stagger: 60  },
  ];

  const allTargets = [];

  GROUPS.forEach(({ sel, stagger }) => {
    const els = [...document.querySelectorAll(sel)];
    els.forEach((el, i) => {
      el.style.setProperty('--entry-delay', `${i * stagger}ms`);
      allTargets.push(el);
    });
  });

  /* Only hide elements that are below the fold so there's no flash on load */
  const vh = window.innerHeight;
  allTargets.forEach(el => {
    const { top } = el.getBoundingClientRect();
    if (top > vh * 0.95) el.classList.add('will-animate');
  });

  const scrollObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        scrollObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.10, rootMargin: '0px 0px -28px 0px' });

  allTargets.forEach(el => scrollObs.observe(el));

  /* ── Stats counter animation ─────────────────────────────────────────── */
  document.querySelectorAll('.stat-block strong').forEach(el => {
    const raw     = el.textContent.trim();
    const num     = parseFloat(raw.replace(/[^0-9.]/g, ''));
    if (!num) return;
    const prefix  = raw.match(/^[^\d]*/)?.[0]  ?? '';
    const suffix  = raw.match(/[^\d.]+$/)?.[0]  ?? '';
    const isInt   = Number.isInteger(num);

    const cntObs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      cntObs.disconnect();
      const t0  = performance.now();
      const dur = 1100;
      const tick = now => {
        const p = Math.min((now - t0) / dur, 1);
        const v = num * easeOut(p);
        el.textContent = `${prefix}${isInt ? Math.round(v) : v.toFixed(1)}${suffix}`;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.55 });

    cntObs.observe(el);
  });

  /* ── Hero parallax on mouse move ─────────────────────────────────────── */
  const hero       = document.querySelector('.hero');
  const phoneStage = document.querySelector('.phone-stage');

  if (hero && phoneStage) {
    let rafId;

    hero.addEventListener('mousemove', e => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const r  = hero.getBoundingClientRect();
        const cx = (e.clientX - r.left) / r.width  - 0.5;   /* –0.5 → +0.5 */
        const cy = (e.clientY - r.top)  / r.height - 0.5;
        /* Subtle 3-D tilt - keeps it elegant, not motion-sick */
        phoneStage.style.transform = `
          perspective(900px)
          rotateY(${ cx *  5}deg)
          rotateX(${-cy *  3}deg)
          translateZ(0)
        `;
      });
    });

    hero.addEventListener('mouseleave', () => {
      cancelAnimationFrame(rafId);
      phoneStage.style.transition = 'transform 700ms cubic-bezier(0.16,1,0.3,1)';
      phoneStage.style.transform  = 'none';
      setTimeout(() => { phoneStage.style.transition = ''; }, 700);
    });
  }

  /* ── Active nav link tracking on scroll ──────────────────────────────── */
  const sections  = [...document.querySelectorAll('section[id]')];
  const navAnchors = [...document.querySelectorAll('.nav-links a[href^="#"]')];

  if (sections.length && navAnchors.length) {
    const navObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navAnchors.forEach(a =>
            a.classList.toggle('nav-active', a.getAttribute('href') === `#${id}`)
          );
        }
      });
    }, { threshold: 0.30 });

    sections.forEach(s => navObs.observe(s));
  }

  /* ── Rate-number callout counter (8.5 vs 2.1) ───────────────────────── */
  document.querySelectorAll('.rate-num').forEach(el => {
    const raw = el.textContent.trim();
    const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
    if (!num) return;
    const suffix = raw.match(/[^\d.]+$/)?.[0] ?? '';

    const rateObs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      rateObs.disconnect();
      const t0  = performance.now();
      const dur = 900;
      const tick = now => {
        const p = Math.min((now - t0) / dur, 1);
        el.textContent = `${(num * easeOut(p)).toFixed(1)}${suffix}`;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.6 });

    rateObs.observe(el);
  });

  /* ── Compliance badge row - staggered scale-in ───────────────────────── */
  const badges = [...document.querySelectorAll('.comp-badge')];
  badges.forEach((badge, i) => {
    badge.style.setProperty('--badge-delay', `${i * 60}ms`);
    badge.classList.add('badge-will-pop');
  });

  const badgeObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.querySelectorAll('.badge-will-pop').forEach(b =>
          b.classList.add('badge-pop')
        );
        badgeObs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  const badgeRow = document.querySelector('.compliance-badge-row');
  if (badgeRow) badgeObs.observe(badgeRow);

})();

