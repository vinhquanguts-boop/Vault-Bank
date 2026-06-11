/**
 * Vault website - feature detail modals
 *
 * Every feature card, section CTA, and key button on the marketing site
 * opens a rich detail panel that shows real Vault-style sample data,
 * explains the feature clearly, and routes the user into the demo app.
 */
(() => {

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  const aud  = v => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(Number(v) || 0);
  const audf = v => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(Number(v) || 0);

  /* Simple progress bar - colour based on percentage */
  function bar(pct, accent) {
    const capped = Math.min(pct, 100);
    const col    = pct > 100 ? '#d8526b' : pct >= 90 ? '#e8c9a0' : (accent || '#2bc985');
    return `<div class="mp-bar"><div class="mp-bar-fill" style="width:${capped}%;background:${col}"></div></div>`;
  }

  /* ── Modal content definitions ──────────────────────────────────────── */
  const MODALS = {

    /* ------------------------------------------------------------------ */
    spend: {
      eyebrow: 'ROOM 01 - SPEND',
      title:   'Spend Smarter',
      subtitle:'Know where your money goes before the month gets messy. Live budgets, category warnings and transaction breakdowns - all in one view.',
      features: [
        'Monthly budget cards per category: groceries, dining, transport, shopping',
        'Colour coded warning states for healthy, near limit and over budget categories',
        'Tap any category to edit its limit or drill into transactions',
        'Total spent vs monthly income tracked in real time',
        'AI weekly digest flags your biggest category shift each week',
      ],
      preview: () => `
        <div class="mp-screen dark">
          <p class="mp-screen-eyebrow">This month</p>
          <div class="mp-total-row">
            <strong class="mp-total-num">$4,000</strong>
            <span class="mp-total-label">of $5,200 budget</span>
          </div>
          ${bar(77, '#e8c9a0')}
          <div class="mp-budget-list">
            <div class="mp-budget-row">
              <span class="mp-cat-name">Groceries</span>
              <span class="mp-cat-amounts">$340 / $400</span>
              ${bar(85)}
              <small class="mp-status ok">85% · Healthy</small>
            </div>
            <div class="mp-budget-row">
              <span class="mp-cat-name">Dining</span>
              <span class="mp-cat-amounts">$280 / $300</span>
              ${bar(93, '#e8c9a0')}
              <small class="mp-status warn">93% · Near limit</small>
            </div>
            <div class="mp-budget-row">
              <span class="mp-cat-name">Transport</span>
              <span class="mp-cat-amounts">$180 / $400</span>
              ${bar(45)}
              <small class="mp-status ok">45% · Healthy</small>
            </div>
            <div class="mp-budget-row">
              <span class="mp-cat-name">Shopping</span>
              <span class="mp-cat-amounts">$420 / $300</span>
              ${bar(140)}
              <small class="mp-status over">Over budget</small>
            </div>
          </div>
        </div>`,
      cta: { text: 'Open Spend Dashboard', href: 'app.html', tab: 'spend' },
    },

    /* ------------------------------------------------------------------ */
    save: {
      eyebrow: 'ROOM 02 - SAVE',
      title:   'Save Calmer',
      subtitle:'Two savings accounts earning real interest, with goal cards that track your progress automatically - no spreadsheets required.',
      features: [
        'Flexible savings: 6.5% p.a., no lock in, withdraw any time',
        'Fixed savings: 8.5% p.a. highest rate, 12 month term',
        'Goal cards track progress toward specific targets (house deposit, emergency fund)',
        'Deposit directly from your balance with one tap',
        'APRA licensed ADI with deposits protected to $250,000 under the FCS',
      ],
      preview: () => `
        <div class="mp-screen dark">
          <div class="mp-savings-row">
            <div class="mp-savings-pot">
              <span class="mp-pot-label">Flexible</span>
              <strong class="mp-pot-amount">$2,440</strong>
              <span class="mp-pot-rate">6.5% p.a.</span>
              <small class="mp-pot-note">No lock in</small>
            </div>
            <div class="mp-savings-pot featured">
              <span class="mp-best-tag">Best rate</span>
              <span class="mp-pot-label">Fixed</span>
              <strong class="mp-pot-amount">$5,512</strong>
              <span class="mp-pot-rate">8.5% p.a.</span>
              <small class="mp-pot-note">12 month term</small>
            </div>
          </div>
          <div class="mp-goal">
            <div class="mp-goal-head">
              <span>Emergency fund</span><span>$2,440 / $5,000</span>
            </div>
            ${bar(49, '#e8c9a0')}
            <small style="color:rgba(196,163,90,0.65)">49% · Est. 14 months at current pace</small>
          </div>
          <div class="mp-goal">
            <div class="mp-goal-head">
              <span>House deposit</span><span>$5,512 / $20,000</span>
            </div>
            ${bar(28)}
            <small style="color:rgba(253,226,218,0.45)">28% complete</small>
          </div>
        </div>`,
      cta: { text: 'Open Savings Demo', href: 'app.html', tab: 'save' },
    },

    /* ------------------------------------------------------------------ */
    metals: {
      eyebrow: 'ROOM 03 - METALS',
      title:   'Grow With Metals',
      subtitle:'Real gold and silver, physically held by the Perth Mint. Not ETFs or paper instruments - actual metal with your name on it.',
      features: [
        'Buy from $50 AUD - no brokerage, no hidden fees beyond a small service charge',
        'Physically held by the Perth Mint, government owned since 1899 and LBMA accredited',
        'AutoAccumulate: set a weekly or monthly buy amount and let it run',
        'Live AUD spot price with a clear fee estimate before every purchase',
        'Gold is an inflation hedge; silver adds portfolio diversification',
      ],
      preview: () => `
        <div class="mp-screen dark">
          <div class="mp-metal-hero">
            <p class="mp-screen-eyebrow">Total holdings value</p>
            <strong class="mp-metal-total">$1,370.38 AUD</strong>
            <small style="color:rgba(253,226,218,0.45);display:block;margin-bottom:18px">12.42g gold + 38.00g silver</small>
          </div>
          <div class="mp-metal-item">
            <span class="mp-metal-icon gold-icon">Au</span>
            <div class="mp-metal-detail">
              <strong>Gold</strong>
              <small>12.42g · $1,323.50</small>
            </div>
            <div class="mp-metal-price-col">
              <strong style="color:#e8c9a0">$3,318.20/oz</strong>
              <small style="color:#2bc985">↑ 2.4% today</small>
            </div>
          </div>
          <div class="mp-metal-item">
            <span class="mp-metal-icon silver-icon">Ag</span>
            <div class="mp-metal-detail">
              <strong>Silver</strong>
              <small>38.00g · $46.88</small>
            </div>
            <div class="mp-metal-price-col">
              <strong style="color:rgba(253,226,218,0.65)">$38.40/oz</strong>
              <small style="color:#2bc985">↑ 1.1% today</small>
            </div>
          </div>
          <div class="mp-mint-badge">Perth Mint · Government owned · LBMA accredited</div>
        </div>`,
      cta: { text: 'Explore Metals', href: 'app.html', tab: 'metals' },
    },

    /* ------------------------------------------------------------------ */
    split: {
      eyebrow: 'ROOM 04 - SPLIT',
      title:   'Split Without Friction',
      subtitle:'Group expenses tracked fairly, reminders sent automatically and settlement handled in one tap - no IOUs, no awkward messages.',
      features: [
        'Create a split for any shared expense - dinner, weekend trip, shared rent',
        'Track exactly who owes what with automatic reminders',
        'Settle instantly from your Vault balance - no bank transfer needed',
        'Full history of all splits: pending, settled, owed to you',
        'Request a split from friends directly inside the app',
      ],
      preview: () => `
        <div class="mp-screen dark">
          <p class="mp-screen-eyebrow">Active splits</p>
          <div class="mp-split-list">
            <div class="mp-split-row">
              <div class="mp-split-info">
                <strong>Beach house weekend</strong>
                <small>with Noah · 3 people</small>
              </div>
              <div class="mp-split-right">
                <strong class="mp-owe">-$118.00</strong>
                <span class="mp-split-badge owe-badge">You owe</span>
              </div>
            </div>
            <div class="mp-split-row settled-row">
              <div class="mp-split-info">
                <strong>Dinner at Icebergs</strong>
                <small>with Emma + 4</small>
              </div>
              <div class="mp-split-right">
                <strong style="color:rgba(253,226,218,0.35)">$42.50</strong>
                <span class="mp-split-badge settled-badge">Settled</span>
              </div>
            </div>
            <div class="mp-split-row">
              <div class="mp-split-info">
                <strong>Monthly groceries</strong>
                <small>with Marcus</small>
              </div>
              <div class="mp-split-right">
                <strong class="mp-owed">+$65.00</strong>
                <span class="mp-split-badge owed-badge">Owed to you</span>
              </div>
            </div>
          </div>
          <div class="mp-split-net">
            <span>Net position</span>
            <strong style="color:#d8526b">-$53.00</strong>
          </div>
        </div>`,
      cta: { text: 'Try Split Demo', href: 'app.html', tab: 'split' },
    },

    /* ------------------------------------------------------------------ */
    card: {
      eyebrow: 'VAULT VISA DEBIT',
      title:   'Your Card, Fully Controlled',
      subtitle:'Rose gold Visa Debit with instant freeze, PIN reveal and full card controls you manage inside the app. No branch visit and no hold music.',
      features: [
        'Freeze and unfreeze your card in one tap - takes effect immediately',
        'Reveal your PIN and CVV securely without calling anyone',
        'Set and adjust your daily spending limit whenever you want',
        'Visa Zero Liability fraud protection on every transaction',
        'Works everywhere Visa is accepted - over 200 countries',
      ],
      preview: () => `
        <div class="mp-screen dark center mp-card-screen">
          <img src="assets/vault_card_front.png" alt="Vault card" class="mp-card-img" />
          <div class="mp-card-data">
            <div class="mp-card-row"><span>Status</span><span class="mp-card-badge active">Active</span></div>
            <div class="mp-card-row"><span>Daily limit</span><strong>$5,000.00</strong></div>
            <div class="mp-card-row"><span>Holder</span><strong>Sarah Chen</strong></div>
            <div class="mp-card-row"><span>Ending</span><strong style="letter-spacing:.12em">8821</strong></div>
            <div class="mp-card-row"><span>PIN</span><strong style="letter-spacing:.25em;color:rgba(253,226,218,0.4)">****</strong></div>
            <div class="mp-card-row"><span>CVV</span><strong style="letter-spacing:.25em;color:rgba(253,226,218,0.4)">***</strong></div>
          </div>
        </div>`,
      cta: { text: 'Manage Card Demo', href: 'app.html', tab: 'card' },
    },

    /* ------------------------------------------------------------------ */
    banking: {
      eyebrow: 'HOW VAULT WORKS',
      title:   'From sign up to your first savings goal in under five minutes.',
      subtitle:'Vault connects your entire financial life into one clean dashboard. Three steps and you\'re earning interest.',
      features: null,
      preview: () => `
        <div class="mp-screen light">
          <div class="mp-steps">
            <div class="mp-step">
              <span class="mp-step-num">01</span>
              <div class="mp-step-body">
                <strong>Create your Vault account</strong>
                <p>Name, email, password. No branch visit, no paperwork. Takes under 60 seconds.</p>
              </div>
            </div>
            <div class="mp-step-connector"></div>
            <div class="mp-step">
              <span class="mp-step-num">02</span>
              <div class="mp-step-body">
                <strong>Connect your bank via CDR</strong>
                <p>Read only and consent based. Vault sees your transactions but cannot move money from your bank.</p>
              </div>
            </div>
            <div class="mp-step-connector"></div>
            <div class="mp-step">
              <span class="mp-step-num">03</span>
              <div class="mp-step-body">
                <strong>Set budgets, save, invest</strong>
                <p>Your categories auto-populate from your transaction history. Add a savings goal. Buy your first gram of gold.</p>
              </div>
            </div>
          </div>
        </div>`,
      cta: { text: 'Try the Demo App', href: 'app.html' },
    },

    /* ------------------------------------------------------------------ */
    invest: {
      eyebrow: 'INVESTMENT CALCULATOR',
      title:   'See the difference a better rate makes',
      subtitle:'Your bank gives you 2.1%. Here is what that actually costs you over time.',
      features: null,
      preview: () => `
        <div class="mp-screen light">
          <div class="mp-calc">
            <div class="mp-calc-row">
              <label class="mp-calc-label">Amount
                <div class="mp-calc-input-wrap">
                  <span class="mp-calc-prefix">$</span>
                  <input type="number" id="calcAmount" value="5000" min="100" max="500000" step="500" class="mp-calc-input" />
                </div>
              </label>
              <label class="mp-calc-label">Duration
                <select id="calcYears" class="mp-calc-select">
                  <option value="1" selected>1 year</option>
                  <option value="2">2 years</option>
                  <option value="3">3 years</option>
                  <option value="5">5 years</option>
                </select>
              </label>
            </div>
            <div id="calcResults" class="mp-calc-results"></div>
          </div>
        </div>`,
      cta: { text: 'Open a Vault Account', href: 'app.html' },
      onOpen: initCalculator,
    },

    /* ------------------------------------------------------------------ */
    partners: {
      eyebrow: 'TRUST & COMPLIANCE',
      title:   'Every dollar. Every gram. Properly protected.',
      subtitle:'The institutions behind Vault are not small startups. They are the same organisations that protect Australia\'s national gold reserves and guarantee your bank deposits.',
      features: [
        'APRA licensed ADI with deposits covered to $250,000 under the Financial Claims Scheme',
        'Perth Mint (Est. 1899) with government owned and LBMA accredited precious metals custody',
        'Visa Zero Liability - full fraud protection on every card transaction',
        'ASIC registered - AFSL holder compliant with Australian financial services law',
        'CDR / Open Banking accredited with read only and consent based bank data access',
        '256-bit encryption, biometric authentication, no user data sold',
      ],
      preview: () => `
        <div class="mp-screen light compact">
          <div class="mp-trust-list">
            <div class="mp-trust-row highlight">
              <span class="mp-trust-name">APRA / ADI</span>
              <small>$250,000 government backed Financial Claims Scheme protection</small>
            </div>
            <div class="mp-trust-row">
              <span class="mp-trust-name">Perth Mint</span>
              <small>Est. 1899 · Western Australian Government · LBMA accredited</small>
            </div>
            <div class="mp-trust-row">
              <span class="mp-trust-name">Visa</span>
              <small>Zero Liability fraud protection · Global acceptance · Instant tap to pay</small>
            </div>
            <div class="mp-trust-row">
              <span class="mp-trust-name">ASIC</span>
              <small>Registered AFSL holder · Australian financial services law</small>
            </div>
            <div class="mp-trust-row">
              <span class="mp-trust-name">CDR / Open Banking</span>
              <small>Read only · Consent based · ACCC accredited data recipient</small>
            </div>
            <div class="mp-trust-row">
              <span class="mp-trust-name">AUSTRAC</span>
              <small>AML / CTF compliance · Identity verification on account creation</small>
            </div>
          </div>
        </div>`,
      cta: { text: 'View Full Compliance →', href: '#partners' },
    },

    /* ------------------------------------------------------------------ */
    advisor: {
      eyebrow: 'EXPERT GUIDANCE',
      title:   'Talk to a licensed advisor - inside Vault',
      subtitle:'Not sure where to start? A 30 minute call with a licensed CFP gives you more clarity than six months of Googling and costs less than a dinner out.',
      features: [
        'All advisors are ASIC registered Certified Financial Planners',
        '$49 per session - no subscription required, no hidden fees',
        'Covers savings strategy, gold allocation and goal based budgeting',
        'AI generates a post session summary stored in your Vault account',
        'Vault takes no commission on investment decisions - advisors are independent',
      ],
      preview: () => `
        <div class="mp-screen light">
          <div class="mp-advisor">
            <div class="mp-advisor-av">SM</div>
            <div class="mp-advisor-info">
              <strong>Sarah Mitchell, CFP</strong>
              <small style="color:rgba(92,46,56,0.55)">ASIC #123456 · 11 years experience</small>
              <div class="mp-advisor-tags">
                <span>Savings</span><span>First home</span><span>Budgeting</span>
              </div>
              <div class="mp-rating-row">
                <span class="mp-stars">★★★★★</span>
                <small style="color:rgba(92,46,56,0.5)">4.9 · 48 sessions</small>
              </div>
              <blockquote class="mp-quote">"Helped me understand gold allocation in under 30 minutes."</blockquote>
            </div>
          </div>
          <div class="mp-booking">
            <div class="mp-booking-row"><span>Next available</span><strong class="avail">Tomorrow, 10am AEST</strong></div>
            <div class="mp-booking-row"><span>Session price</span><strong>$49 / session</strong></div>
            <div class="mp-booking-row"><span>Format</span><strong>Video (Zoom or Google Meet)</strong></div>
          </div>
        </div>`,
      cta: { text: 'Book a Consultation', href: 'app.html' },
    },

    /* ------------------------------------------------------------------ */
    database: {
      eyebrow: 'TECHNICAL DETAIL',
      title:   'Under the Hood',
      subtitle:'What the Vault prototype stores, how the data is structured, and the straightforward migration path to a production database.',
      features: null,
      preview: () => `
        <div class="mp-screen light compact">
          <div class="mp-db-table">
            <div class="mp-db-header-row">Collection / Table · Fields stored</div>
            ${[
              ['User',          'name, email, balance, savings, trust score, card status'],
              ['Transactions',  'title, amount, category, type, date, userId'],
              ['Budgets',       'name, limit, spent, icon, userId'],
              ['Savings Goals', 'name, current, target, userId'],
              ['Cards',         'holder, last4, PIN, CVV, frozen, dailyLimit'],
              ['Metal Holdings','gold (g), silver (g), currency, userId'],
              ['Split Bills',   'name, friend, amount, status, userId'],
            ].map(([name, fields]) => `
              <div class="mp-db-row">
                <span class="mp-db-name">${name}</span>
                <span class="mp-db-fields">${fields}</span>
              </div>`).join('')}
          </div>
          <div class="mp-db-path">
            <span class="mp-db-stage current">JSON</span>
            <span class="mp-db-arrow">→</span>
            <span class="mp-db-stage">SQLite + Prisma</span>
            <span class="mp-db-arrow">→</span>
            <span class="mp-db-stage">Supabase / Postgres</span>
          </div>
        </div>`,
      cta: { text: 'View Admin Panel', href: 'admin.html' },
    },

  }; /* end MODALS */

  /* ── Product tour - step definitions ────────────────────────────────── */
  const TOUR_STEPS = [
    {
      num: '01', label: 'Account',
      title: 'Create your Vault account in 60 seconds',
      desc: 'Name, email and password. No branch visit and no paperwork. AUSTRAC compliant identity verification happens automatically in the background.',
      previewHTML: `
        <div class="mp-screen dark">
          <p class="mp-screen-eyebrow">Create account</p>
          <div class="mp-tour-fields">
            <div class="mp-tour-field"><small>Full name</small><span>Sarah Chen</span></div>
            <div class="mp-tour-field"><small>Email</small><span>sarah@vault.au</span></div>
            <div class="mp-tour-field"><small>Password</small><span>********</span></div>
          </div>
          <div class="mp-tour-submit">Create my Vault account →</div>
          <p class="mp-tour-note">Under 60 seconds · No branch · eKYC verified</p>
        </div>`,
      href: 'app.html',
    },
    {
      num: '02', label: 'Bank',
      title: 'Connect your bank via Open Banking',
      desc: 'Read only CDR connection. Vault sees your transaction history to auto build budgets. It cannot move money from your connected bank.',
      previewHTML: `
        <div class="mp-screen dark">
          <p class="mp-screen-eyebrow">Select your bank</p>
          <div class="mp-tour-bank-list">
            <div class="mp-tour-bank-row mp-tour-bank-selected">
              <span>Commonwealth Bank</span>
              <span style="color:#2bc985;font-size:.72rem">✓ Connected</span>
            </div>
            <div class="mp-tour-bank-row">ANZ</div>
            <div class="mp-tour-bank-row">Westpac</div>
            <div class="mp-tour-bank-row">NAB</div>
          </div>
          <p class="mp-tour-note">Read only · CDR accredited · Revoke access anytime</p>
        </div>`,
      href: 'app.html',
    },
    {
      num: '03', label: 'Budget',
      title: 'Budgets populate from your real transactions',
      desc: 'Vault reads 3 months of history and creates category limits automatically. You adjust the amounts and Vault handles all the tracking.',
      previewHTML: MODALS.spend.preview(),
      href: 'app.html#spend',
    },
    {
      num: '04', label: 'Save',
      title: 'Save at 6.5% flexible or lock in 8.5%',
      desc: 'Two savings accounts, both earning real interest. Flexible gives you liquidity. Fixed gives you the best rate - no middleman.',
      previewHTML: MODALS.save.preview(),
      href: 'app.html#save',
    },
    {
      num: '05', label: 'Metals',
      title: 'Buy real gold and silver from $50 AUD',
      desc: 'Physical precious metals, held in your name by the Perth Mint. AutoAccumulate sets a weekly or monthly buy - it runs itself.',
      previewHTML: MODALS.metals.preview(),
      href: 'app.html#metals',
    },
    {
      num: '06', label: 'Card',
      title: 'Full card control without calling anyone',
      desc: 'Freeze your rose gold Visa Debit, reveal PIN or CVV, adjust daily limits and review card activity from the Vault app.',
      previewHTML: MODALS.card.preview(),
      href: 'app.html#card',
    },
    {
      num: '07', label: 'Split',
      title: 'Split bills without the awkward follow ups',
      desc: 'Create a split, track who owes what, and settle in one tap from your Vault balance. Automatic reminders handle the nudging.',
      previewHTML: MODALS.split.preview(),
      href: 'app.html#split',
    },
  ];

  /* ── Tour modal ──────────────────────────────────────────────────────── */
  MODALS.tour = {
    eyebrow: 'VAULT PRODUCT TOUR',
    title: 'Seven steps. One complete banking experience.',
    subtitle: 'From first login to your first investment - here is exactly what Vault looks like when you use it.',
    features: null,
    preview: () => TOUR_STEPS[0].previewHTML,
    cta: { text: 'Start in App', href: 'app.html' },
    onOpen: initTour,
  };

  /* ── Team modal ──────────────────────────────────────────────────────── */
  MODALS.team = {
    eyebrow: 'THE PEOPLE BEHIND VAULT',
    title: 'Built by Australians who understand your money',
    subtitle: 'The founders and team behind Vault bring deep expertise in fintech engineering, banking compliance and product design.',
    features: [
      'Alex Harrison (CEO) - 12 years leading digital products at Commonwealth Bank',
      'Maya Krishnan (CTO) - Fintech engineering at Airwallex and Zip',
      'James Tran (CCO) - ASIC specialist, former Deloitte financial advisory',
      'Sophie Chen - Strategic partnerships: Perth Mint, Visa, and ADI providers',
      'Advisory board: Big 4 banking, Afterpay era fintech, Perth Mint executives',
    ],
    preview: () => `
      <div class="mp-screen light compact mp-team-screen">
        <div class="mp-team-grid">
          ${[
            ['AH', '0',   'Alex Harrison',  'CEO · CommBank 12yr'],
            ['MK', '20',  'Maya Krishnan',  'CTO · Airwallex, Zip'],
            ['JT', '340', 'James Tran',     'CCO · ASIC specialist'],
            ['SC', '10',  'Sophie Chen',    'Partnerships · ANZ'],
            ['LW', '350', 'Liam Watts',     'Product · NAB UX'],
            ['PR', '30',  'Priya Rao',      'Growth · Fintech x3'],
          ].map(([ini, hue, name, role]) => `
            <div class="mp-team-tile">
              <div class="mp-team-av" style="--av-hue:${hue}">${ini}</div>
              <strong>${name}</strong>
              <small>${role}</small>
            </div>`).join('')}
        </div>
      </div>`,
    cta: { text: 'Meet the Full Team', href: '#team' },
  };

  /* ── Tour engine ─────────────────────────────────────────────────────── */
  let _tourStep = 0;

  function renderTourStep(step) {
    const s    = TOUR_STEPS[step];
    const info = bodyEl.querySelector('.vaultmodal-info');
    const prev = bodyEl.querySelector('.vaultmodal-preview');

    if (info) {
      info.innerHTML = `
        <header class="vaultmodal-header">
          <p class="vaultmodal-eyebrow">VAULT TOUR · STEP ${s.num} / 07</p>
          <h2 class="vaultmodal-title">${s.title}</h2>
          <p class="vaultmodal-subtitle">${s.desc}</p>
        </header>
        <nav class="mp-tour-dot-row" aria-label="Tour steps">
          ${TOUR_STEPS.map((ts, i) =>
            `<button class="mp-tour-dot${i === step ? ' active' : ''}" data-step="${i}"
              aria-label="Step ${ts.num}: ${ts.label}"${i === step ? ' aria-current="step"' : ''}></button>`
          ).join('')}
        </nav>
        <div class="vaultmodal-actions mp-tour-btns">
          <button class="button soft mp-tour-prev"${step === 0 ? ' disabled style="opacity:.4"' : ''}>← Prev</button>
          ${step < TOUR_STEPS.length - 1
            ? `<button class="button primary mp-tour-next">Next →</button>`
            : `<a class="button primary" href="${s.href}">Open in App →</a>`}
        </div>
        ${step < TOUR_STEPS.length - 1
          ? `<a href="${s.href}" class="mp-tour-skip">Try "${s.label}" in the app →</a>`
          : ''}
      `;

      info.querySelector('.mp-tour-prev')?.addEventListener('click', () => {
        if (_tourStep > 0) renderTourStep(--_tourStep);
      });
      info.querySelector('.mp-tour-next')?.addEventListener('click', () => {
        if (_tourStep < TOUR_STEPS.length - 1) renderTourStep(++_tourStep);
      });
      info.querySelectorAll('.mp-tour-dot').forEach(dot =>
        dot.addEventListener('click', () => renderTourStep((_tourStep = +dot.dataset.step)))
      );
    }

    if (prev) {
      prev.innerHTML = s.previewHTML;
      prev.classList.remove('preview-light');
    }
  }

  function initTour() {
    _tourStep = 0;
    renderTourStep(0);
  }

  /* ── Interest calculator ─────────────────────────────────────────────── */
  let _calcTimer = null; /* guard against stacked listeners on rapid re-open */

  function initCalculator() {
    clearTimeout(_calcTimer); /* cancel any pending bind from a previous open */

    const update = () => {
      const amt  = parseFloat(document.getElementById('calcAmount')?.value) || 5000;
      const yrs  = parseFloat(document.getElementById('calcYears')?.value)  || 1;
      const el   = document.getElementById('calcResults');
      if (!el) return;

      const rows = [
        { label: 'Your bank',      rate: 0.021, color: 'rgba(253,226,218,0.32)', tag: '2.1% p.a.' },
        { label: 'Vault Flexible', rate: 0.065, color: '#2bc985',               tag: '6.5% p.a.' },
        { label: 'Vault Fixed',    rate: 0.085, color: '#e8c9a0',               tag: '8.5% p.a.' },
      ];

      const maxEarned = amt * (Math.pow(1.085, yrs) - 1);

      el.innerHTML = rows.map(({ label, rate, color, tag }) => {
        const earned = amt * (Math.pow(1 + rate, yrs) - 1);
        const total  = amt + earned;
        const barW   = maxEarned > 0 ? (earned / maxEarned * 100) : 0;
        return `
          <div class="mp-calc-result">
            <div class="mp-calc-result-head">
              <span>${label}</span>
              <span style="color:${color};font-weight:700;font-size:.78rem">${tag}</span>
            </div>
            <div class="mp-bar"><div class="mp-bar-fill" style="width:${barW.toFixed(1)}%;background:${color}"></div></div>
            <div class="mp-calc-nums">
              <small>Interest earned: <strong style="color:${color}">${aud(earned)}</strong></small>
              <small style="color:rgba(92,46,56,0.55)">Total: ${aud(total)}</small>
            </div>
          </div>`;
      }).join('');
    };

    /* Bind after DOM settles - one timer at a time */
    _calcTimer = setTimeout(() => {
      _calcTimer = null;
      document.getElementById('calcAmount')?.addEventListener('input', update);
      document.getElementById('calcYears')?.addEventListener('change', update);
      update();
    }, 60);
  }

  /* ── Modal engine ────────────────────────────────────────────────────── */
  const overlay   = document.getElementById('vaultModal');
  const bodyEl    = document.getElementById('vaultModalBody');
  const closeBtn  = document.getElementById('vaultModalClose');
  if (!overlay || !bodyEl) return;

  let _lastFocus = null;

  function openModal(id) {
    const d = MODALS[id];
    if (!d) return;

    _lastFocus = document.activeElement;

    const featureHTML = d.features
      ? `<ul class="vaultmodal-features">${d.features.map(f =>
          `<li class="vaultmodal-feature">${f}</li>`).join('')}</ul>`
      : '';

    const href = d.cta.href + (d.cta.tab ? `#${d.cta.tab}` : '');

    bodyEl.innerHTML = `
      <div class="vaultmodal-info">
        <header class="vaultmodal-header">
          <p class="vaultmodal-eyebrow">${d.eyebrow}</p>
          <h2 class="vaultmodal-title">${d.title}</h2>
          <p class="vaultmodal-subtitle">${d.subtitle}</p>
        </header>
        ${featureHTML}
        <div class="vaultmodal-actions">
          <a href="${href}" class="button primary">${d.cta.text}</a>
        </div>
      </div>
      <div class="vaultmodal-preview">
        ${d.preview ? d.preview() : ''}
      </div>
    `;

    /* Accessible label - updated dynamically so it's always valid */
    overlay.setAttribute('aria-label', d.title);

    /* Light-themed previews get a warm background instead of near-black */
    const previewCol = bodyEl.querySelector('.vaultmodal-preview');
    if (previewCol) {
      previewCol.classList.toggle('preview-light', !!previewCol.querySelector('.mp-screen.light'));
    }

    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    /* Focus close button after panel animates in */
    setTimeout(() => closeBtn?.focus(), 80);

    if (d.onOpen) d.onOpen();
  }

  function closeModal() {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    _lastFocus?.focus();
  }

  /* ── Event bindings ──────────────────────────────────────────────────── */

  /* Feature grid cards */
  document.querySelectorAll('.feature-grid article[data-modal]').forEach(el => {
    el.addEventListener('click',   () => openModal(el.dataset.modal));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(el.dataset.modal); }
    });
  });

  /* Generic [data-modal] buttons/links on the page */
  document.querySelectorAll('[data-modal]:not(.feature-grid article)').forEach(el => {
    el.addEventListener('click', e => {
      /* Let inner links and non-modal buttons navigate normally */
      if (e.target !== el && e.target.closest('a[href], button:not([data-modal])')) return;
      e.preventDefault();
      openModal(el.dataset.modal);
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(el.dataset.modal); }
    });
  });

  /* Invest section CTA → calculator */
  document.querySelector('.invest-cta-bar .button')?.addEventListener('click', e => {
    e.preventDefault();
    openModal('invest');
  });

  /* Partners compliance link → full trust modal */
  document.querySelector('.partners-doc-link a')?.addEventListener('click', e => {
    e.preventDefault();
    openModal('partners');
  });

  /* Advisor "Book now" buttons */
  document.querySelectorAll('.advisor-book-btn').forEach(btn =>
    btn.addEventListener('click', e => { e.preventDefault(); openModal('advisor'); })
  );

  /* Invest method cards → comparison calculator */
  document.querySelectorAll('.method-card').forEach(card =>
    card.addEventListener('click', () => openModal('invest'))
  );

  /* Partner cards + logo strip → trust details */
  document.querySelectorAll('.partner-card, .partner-logo-item').forEach(el => {
    el.addEventListener('click', () => openModal('partners'));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal('partners'); }
    });
  });

  /* Database section - inject a "Technical details" button */
  const dbSection = document.querySelector('.database-section .eyebrow')?.closest('div');
  if (dbSection) {
    const dbBtn = Object.assign(document.createElement('button'), {
      className: 'button soft modal-trigger-btn',
      textContent: 'Technical details →',
    });
    dbBtn.style.marginTop = '22px';
    dbSection.appendChild(dbBtn);
    dbBtn.addEventListener('click', () => openModal('database'));
  }

  /* Close: button, overlay click, Escape */
  closeBtn?.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('is-open')) closeModal();
  });

})();
