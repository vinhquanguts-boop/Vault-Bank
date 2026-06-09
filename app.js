const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

/* Animation helpers */

/* Count a DOM element's text from its current number to a target */
const easeOutCubic = t => 1 - (1 - t) ** 3;

function countUp(el, target, duration = 900) {
  const start  = performance.now();
  const from   = parseFloat(String(el.textContent).replace(/[^0-9.-]/g, '')) || 0;
  const tick   = now => {
    const p   = Math.min((now - start) / duration, 1);
    const val = from + (target - from) * easeOutCubic(p);
    el.textContent = money(val);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = money(target);
  };
  requestAnimationFrame(tick);
}

/* Flash a class on an element, removing it first so re-triggering works */
function flashClass(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  requestAnimationFrame(() => el.classList.add(cls));
}

let state = null;
let activeUserId = localStorage.getItem("vaultUserId");

const firebaseConfig = {
  apiKey: "AIzaSyDZZhJY483c5JEZMdp4ILU2o5--lfPlANw",
  authDomain: "vault-bank-f29a3.firebaseapp.com",
  projectId: "vault-bank-f29a3",
  storageBucket: "vault-bank-f29a3.firebasestorage.app",
  messagingSenderId: "908089881198",
  appId: "1:908089881198:web:137c6aebb137fe686fac7f",
  measurementId: "G-GVNHKJ31C1"
};

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
const FIRESTORE_KEY = firebaseConfig.apiKey;
const STATIC_PREVIEW_PORTS = new Set(["500", "5500", "5501"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", ""]);
const USE_FIREBASE = location.protocol === "file:" || STATIC_PREVIEW_PORTS.has(location.port) || !LOCAL_HOSTS.has(location.hostname);
const defaultSettings = {
  goldAud: 3318.2,
  silverAud: 38.4,
  metalFee: 0.99,
  metalBuySpreadPct: 0.75,
  metalSellSpreadPct: 0.50,
  bankName: "VAULT Bank",
  tagline: "Spend smarter. Save calmer. Grow with confidence."
};

const money = value => new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD"
}).format(Number(value || 0));

function toast(message, type = '') {
  const el = $("#toast");
  el.textContent = message;
  el.className = 'toast show' + (type ? ' toast-' + type : '');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2800);
}

function parseFirestoreValue(value = {}) {
  if ("stringValue" in value) return value.stringValue;
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("integerValue" in value) return Number(value.integerValue);
  if ("booleanValue" in value) return Boolean(value.booleanValue);
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(parseFirestoreValue);
  if ("mapValue" in value) {
    return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, parseFirestoreValue(item)]));
  }
  return "";
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (typeof value === "object") {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toFirestoreValue(item)])) } };
  }
  return { stringValue: String(value) };
}

function fromFirestoreDoc(doc) {
  const id = doc.name.split("/").pop();
  const fields = Object.fromEntries(Object.entries(doc.fields || {}).map(([key, item]) => [key, parseFirestoreValue(item)]));
  return { id, ...fields };
}

async function firestoreRequest(path, options = {}) {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(`${FIRESTORE_BASE}/${path}${separator}key=${FIRESTORE_KEY}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || "Firestore request failed");
  return data;
}

async function firestoreDoc(path) {
  return fromFirestoreDoc(await firestoreRequest(path));
}

async function firestoreCollection(collection) {
  const data = await firestoreRequest(collection);
  return (data.documents || []).map(fromFirestoreDoc);
}

async function firestorePatch(path, data) {
  const body = {
    fields: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)]))
  };
  return fromFirestoreDoc(await firestoreRequest(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }));
}

const numberValue = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function userFromFirestore(user) {
  return {
    id: user.id,
    name: user.name || "Sarah Chen",
    email: user.email || "sarah@vault.au",
    avatar: user.avatar || (user.name || "S").charAt(0).toUpperCase(),
    balance: numberValue(user.balance, 16032.05),
    monthlyIncome: numberValue(user.monthlyIncome, 8686),
    spent: numberValue(user.spent, 4000),
    saved: numberValue(user.saved, 850),
    trustScore: numberValue(user.trustScore ?? user.trutScore, 78),
    createdAt: user.createdAt || new Date().toISOString()
  };
}

async function firestoreState(userId = "u1") {
  const [userDoc, transactions, budgets, goals, cards, metalHoldings, splitBills] = await Promise.all([
    firestoreDoc(`User/${userId}`),
    firestoreCollection("transactions"),
    firestoreCollection("budgets"),
    firestoreCollection("savingsGoals"),
    firestoreCollection("cards"),
    firestoreCollection("metalHoldings"),
    firestoreCollection("splitBills")
  ]);

  const userTransactions = transactions.filter(item => !item.userId || item.userId === userId).map(item => ({
    id: item.id,
    title: item.title || "Transaction",
    category: item.category || "General",
    amount: numberValue(item.amount, item.category === "Income" ? 8888 : -42.5),
    type: item.type || (numberValue(item.amount, 0) >= 0 ? "income" : "expense"),
    date: item.date || "Today"
  }));

  const userBudgets = budgets.filter(item => !item.userId || item.userId === userId).map(item => ({
    id: item.id,
    name: item.name || "Budget",
    spent: numberValue(item.spent, 0),
    limit: numberValue(item.limit, 400),
    icon: item.icon || "basket"
  }));

  const userGoals = goals.filter(item => !item.userId || item.userId === userId).map(item => ({
    id: item.id,
    name: item.name || "Savings goal",
    current: numberValue(item.current, 0),
    target: numberValue(item.target, 3000)
  }));

  const metalsDoc = metalHoldings.find(item => !item.userId || item.userId === userId) || {};
  const cardDoc = cards.find(item => !item.userId || item.userId === userId) || {};
  const userSplits = splitBills.filter(item => !item.userId || item.userId === userId).map(item => ({
    id: item.id,
    name: item.name || "Split bill",
    friend: item.friend || "Friend",
    amount: numberValue(item.amount, item.name === "Beach house" ? 118 : 42.5),
    status: item.status || "owed"
  }));

  return {
    user: userFromFirestore(userDoc),
    budgets: userBudgets.length ? userBudgets : [{ id: "b1", name: "Groceries", spent: 340, limit: 400, icon: "basket" }],
    savings: {
      flexible: numberValue(userDoc.flexibleSavings, 2440),
      fixed: numberValue(userDoc.fixedSavings, 5512),
      goals: userGoals.length ? userGoals : [{ id: "g1", name: "Emergency fund", current: 2440, target: 5000 }]
    },
    metals: {
      id: metalsDoc.id || "m1",
      gold: numberValue(metalsDoc.gold, 12.42),
      silver: numberValue(metalsDoc.silver, 38)
    },
    splits: userSplits.length ? userSplits : [{ id: "s1", name: "Beach house", friend: "Noah", amount: 118, status: "owe" }],
    transactions: userTransactions.length ? userTransactions : [{ id: "t1", title: "Salary March", category: "Income", amount: 8888, type: "income", date: "Today" }],
    card: {
      id: cardDoc.id || "c1",
      holder: cardDoc.holder || userDoc.name || "Sarah Chen",
      last4: cardDoc.last4 || userDoc.cardLast4 || "8821",
      pin: cardDoc.pin || "4821",
      cvv: cardDoc.cvv || "482",
      dailyLimit: numberValue(cardDoc.dailyLimit, 5000),
      frozen: Boolean(cardDoc.frozen) || cardDoc.status === "Frozen",
      status: cardDoc.status || userDoc.cardStatus || "Active"
    },
    settings: defaultSettings
  };
}

async function firebaseApi(path, options = {}) {
  const method = options.method || "GET";
  const body = options.body ? JSON.parse(options.body) : {};

  if (method === "GET" && path.startsWith("/api/state/")) {
    return firestoreState(decodeURIComponent(path.split("/").pop()));
  }

  if (method === "POST" && path === "/api/login") {
    const users = await firestoreCollection("User");
    const user = users.find(item => String(item.email || "").toLowerCase() === String(body.email || "").toLowerCase());
    if (!user) throw new Error("No Firebase user found for that email");
    return firestoreState(user.id);
  }

  if (method === "POST" && path === "/api/signup") {
    if (!body.name || !body.email) throw new Error("Name and email are required");
    const userId = `u_${Date.now()}`;
    await firestorePatch(`User/${userId}`, {
      name: body.name,
      email: String(body.email).toLowerCase(),
      balance: 1250,
      monthlyIncome: 0,
      spent: 0,
      saved: 0,
      trustScore: 72,
      cardLast4: String(Math.floor(1000 + Math.random() * 8999)),
      cardStatus: "Active",
      createdAt: new Date().toISOString()
    });
    await firestorePatch(`cards/c_${Date.now()}`, {
      userId,
      holder: body.name,
      last4: "8821",
      status: "Active"
    });
    return firestoreState(userId);
  }

  if (method === "POST" && path === "/api/action") {
    const current = await firestoreState(body.userId);
    const userPath = `User/${current.user.id}`;

    if (body.type === "add-transaction") {
      const amount = numberValue(body.amount, 0);
      await firestorePatch(userPath, { balance: current.user.balance + amount });
      await firestorePatch(`transactions/t_${Date.now()}`, {
        userId: current.user.id,
        title: body.title || "Manual transaction",
        category: body.category || "General",
        amount,
        type: amount >= 0 ? "income" : "expense",
        date: "Just now"
      });
    }

    if (body.type === "transfer-savings") {
      const amount = numberValue(body.amount, 0);
      const bucket = body.bucket === "fixed" ? "fixedSavings" : "flexibleSavings";
      await firestorePatch(userPath, {
        balance: current.user.balance - amount,
        [bucket]: current.savings[body.bucket === "fixed" ? "fixed" : "flexible"] + amount
      });
      await firestorePatch(`transactions/t_${Date.now()}`, {
        userId: current.user.id,
        title: "Savings deposit",
        category: "Savings",
        amount: -amount,
        type: "transfer",
        date: "Just now"
      });
    }

    if (body.type === "buy-metal") {
      const metal = body.metal === "silver" ? "silver" : "gold";
      const grams = numberValue(body.grams, 0);
      const spotAud = metal === "gold" ? defaultSettings.goldAud : defaultSettings.silverAud;
      const spotPerGram = spotAud / 31.1035;
      const buySpread = spotPerGram * ((defaultSettings.metalBuySpreadPct || 0.75) / 100);
      const cost = Number(((spotPerGram + buySpread) * grams + defaultSettings.metalFee).toFixed(2));
      await firestorePatch(userPath, { balance: current.user.balance - cost });
      await firestorePatch(`metalHoldings/${current.metals.id}`, {
        userId: current.user.id,
        gold: metal === "gold" ? current.metals.gold + grams : current.metals.gold,
        silver: metal === "silver" ? current.metals.silver + grams : current.metals.silver,
        currency: "AUD"
      });
      await firestorePatch(`transactions/t_${Date.now()}`, {
        userId: current.user.id,
        title: `Bought ${grams}g ${metal}`,
        category: "Metals",
        amount: -cost,
        type: "expense",
        date: "Just now"
      });
    }

    if (body.type === "sell-metal") {
      const metal = body.metal === "silver" ? "silver" : "gold";
      const grams = numberValue(body.grams, 0);
      const spotAud = metal === "gold" ? defaultSettings.goldAud : defaultSettings.silverAud;
      const spotPerGram = spotAud / 31.1035;
      const sellSpread = spotPerGram * ((defaultSettings.metalSellSpreadPct || 0.5) / 100);
      const sellPerGram = spotPerGram - sellSpread;
      const proceeds = Number(((sellPerGram * grams) - defaultSettings.metalFee).toFixed(2));
      const currentGrams = metal === "gold" ? current.metals.gold : current.metals.silver;
      if (grams > currentGrams) throw new Error(`You only hold ${currentGrams.toFixed(2)}g ${metal}.`);
      if (proceeds <= 0) throw new Error("Amount too small after fee deduction.");
      await firestorePatch(userPath, { balance: current.user.balance + proceeds });
      await firestorePatch(`metalHoldings/${current.metals.id}`, {
        userId: current.user.id,
        gold: metal === "gold" ? current.metals.gold - grams : current.metals.gold,
        silver: metal === "silver" ? current.metals.silver - grams : current.metals.silver,
        currency: "AUD"
      });
      await firestorePatch(`transactions/t_${Date.now()}`, {
        userId: current.user.id,
        title: `Sold ${grams}g ${metal}`,
        category: "Metals",
        amount: proceeds,
        type: "income",
        date: "Just now"
      });
    }

    if (body.type === "create-split") {
      const friends = String(body.friends || "").split(",").map(f => f.trim()).filter(Boolean);
      await firestorePatch(`splitBills/s_${Date.now()}`, {
        userId: current.user.id,
        name: body.name || "Split",
        amount: numberValue(body.share, 0),
        totalAmount: numberValue(body.totalAmount, 0),
        friend: friends.join(", ") || "Friend",
        splitType: body.splitType || "equal",
        status: body.paidByMe ? "owed" : "owe",
        date: new Date().toISOString()
      });
    }

    if (body.type === "split-remind") {
      /* Mark reminded - no balance change, just status update */
      const split = current.splits.find(item => item.id === body.splitId);
      if (split) {
        await firestorePatch(`splitBills/${split.id}`, {
          userId: current.user.id,
          status: split.status,
          reminded: true
        });
      }
    }

    if (body.type === "transfer-send") {
      const amount = numberValue(body.amount, 0);
      if (amount <= 0) throw new Error("Amount must be greater than zero.");
      if (amount > current.user.balance) throw new Error(`Insufficient balance. You have ${money(current.user.balance)}.`);
      await firestorePatch(userPath, { balance: current.user.balance - amount });
      await firestorePatch(`transactions/t_${Date.now()}`, {
        userId: current.user.id,
        title: `Transfer to ${body.recipientName || "recipient"}`,
        category: "Transfer",
        amount: -amount,
        type: "expense",
        date: "Just now"
      });
    }

    if (body.type === "split-settle") {
      const split = current.splits.find(item => item.id === body.splitId);
      if (split && split.status === "owe") {
        await firestorePatch(userPath, { balance: current.user.balance - split.amount });
        await firestorePatch(`splitBills/${split.id}`, { userId: current.user.id, status: "settled" });
      }
    }

    if (body.type === "card-toggle") {
      const nextFrozen = !current.card.frozen;
      const nextStatus = nextFrozen ? "Frozen" : "Active";
      await firestorePatch(`cards/${current.card.id}`, {
        userId: current.user.id,
        holder: current.card.holder,
        last4: current.card.last4,
        frozen: nextFrozen,
        status: nextStatus
      });
      await firestorePatch(userPath, { cardStatus: nextStatus });
    }

    return firestoreState(current.user.id);
  }

  throw new Error("Firebase route not implemented");
}

async function api(path, options = {}) {
  if (USE_FIREBASE) {
    try {
      return await firebaseApi(path, options);
    } catch (firebaseError) {
      console.warn("Firebase unavailable, using local demo API:", firebaseError.message);
      if (location.port === "5500") throw firebaseError;
    }
  }

  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

async function loadState(userId = activeUserId) {
  if (!userId) return;
  state = await api(`/api/state/${encodeURIComponent(userId)}`);
  activeUserId = state.user.id;
  localStorage.setItem("vaultUserId", activeUserId);
  showDashboard();
  render();
}

function showDashboard() {
  $("#authPanel").classList.add("hidden");
  const dashboard = $("#dashboard");
  dashboard.classList.remove("hidden");
  dashboard.classList.remove("dashboard-reveal");
  requestAnimationFrame(() => dashboard.classList.add("dashboard-reveal"));
}

async function postAction(payload, successMessage) {
  state = await api("/api/action", {
    method: "POST",
    body: JSON.stringify({ userId: activeUserId, ...payload })
  });
  render();
  if (successMessage) toast(successMessage, 'success');

  /* Flash the relevant value element after each action type */
  if (payload.type === 'transfer-savings') {
    const el = payload.bucket === 'fixed' ? $("#fixedSavings") : $("#flexibleSavings");
    flashClass(el, 'savings-updated');
  }
  if (payload.type === 'buy-metal') {
    flashClass($("#metalValue"), 'metal-updated');
  }
  if (payload.type === 'add-transaction') {
    flashClass($("#balance"), 'value-updated');
  }
}

let _prevBalance      = null;
let _metalAction      = 'buy';
let _metalType        = 'gold';
let _splitFilter      = 'all';
let _splitType        = 'equal';
let _transferMethod   = 'bsb';
let _pendingTransfer  = null;
let _enteredPin       = '';
let _txFilter         = 'all';
let _txSearch         = '';
let _pinRevealTimer   = null;
let _cvvRevealTimer   = null;
let _activeTxId       = null;
let _mergedRecipients = [];

/* Invest tab state */
let _investAsset       = 'portfolio';
let _investChartType   = 'line';
let _investTimeRange   = '1M';
let _investChart       = null;          /* Chart.js instance */
let _liveMarketPrices  = null;          /* client-side live prices */
let _liveTickTimer     = null;          /* price tick interval */
let _investTradePending = null;         /* { symbol, name, mode: 'buy'|'sell' } */

function render() {
  if (!state) return;
  const { user } = state;
  $("#helloName").textContent = `Good evening, ${user.name.split(" ")[0]}`;

  /* Balance count-up on first load; shorter animation on updates */
  const balEl = $("#balance");
  countUp(balEl, user.balance, _prevBalance === null ? 1100 : 600);
  if (_prevBalance !== null && _prevBalance !== user.balance) {
    flashClass(balEl, 'value-updated');
  }
  _prevBalance = user.balance;

  $("#digestText").textContent = `Score ${user.trustScore}. You are on track this month.`;
  $("#trustScore").textContent = user.trustScore;
  renderMetrics();
  renderHomeSnapshot();
  renderTransactions();
  renderBudgets();
  renderTxList();
  renderSavings();
  renderMetals();
  renderSplits();
  renderCard();
  renderCardTxList();
  renderTransfer();
  renderProfile();
  renderSecurityLog();
  renderInvest();
}

function renderMetrics() {
  $("#metrics").innerHTML = [
    ["Income", money(state.user.monthlyIncome), "This month"],
    ["Spent",  money(state.user.spent),         "Tracked spending"],
    ["Saved",  money(state.user.saved),         "Projected gain"],
    ["Metals", money(metalValue()),              "Live holdings"]
  ].map(([label, value, note]) => `
    <article class="metric">
      <b>${value}</b>
      <span>${label}</span>
      <small>${note}</small>
    </article>
  `).join("");

  /* Staggered entrance animation on each card */
  requestAnimationFrame(() => {
    $$("#metrics .metric").forEach((card, i) => {
      card.style.setProperty('--metric-delay', `${i * 80}ms`);
      card.classList.remove('metric-enter');
      requestAnimationFrame(() => card.classList.add('metric-enter'));
    });
  });
}

function renderTransactions() {
  $("#transactions").innerHTML = state.transactions.slice(0, 8).map(item => `
    <div class="list-row">
      <span><b>${item.title}</b><br><small>${item.category} · ${item.date}</small></span>
      <strong class="${item.amount >= 0 ? "positive" : "negative"}">${item.amount >= 0 ? "+" : ""}${money(item.amount)}</strong>
    </div>
  `).join("");

  /* Staggered slide-in for each row */
  requestAnimationFrame(() => {
    $$("#transactions .list-row").forEach((row, i) => {
      row.style.setProperty('--row-delay', `${i * 42}ms`);
      row.classList.remove('tx-row-enter');
      requestAnimationFrame(() => row.classList.add('tx-row-enter'));
    });
  });
}

function renderBudgets() {
  $("#budgets").innerHTML = state.budgets.map(budget => {
    const pct  = Math.min(100, Math.round((budget.spent / budget.limit) * 100));
    const tone = pct > 100 ? "over-budget" : pct >= 90 ? "careful" : "healthy";
    const toneLabel = pct > 100 ? "Over budget" : pct >= 90 ? "Careful" : "Healthy";
    return `
      <article class="budget-card ${tone}">
        <div class="budget-card-top">
          <h3>${budget.name}</h3>
          <div class="budget-card-actions">
            <button class="btn-icon" data-budget-edit="${budget.id}" data-budget-name="${budget.name}" data-budget-limit="${budget.limit}" title="Edit">✎</button>
            <button class="btn-icon danger-text" data-budget-delete="${budget.id}" title="Delete">✕</button>
          </div>
        </div>
        <p>${money(budget.spent)} of ${money(budget.limit)}</p>
        <div class="progress">
          <span style="width:0%" data-target="${Math.min(pct, 100)}%"></span>
        </div>
        <small>${pct}% used · ${toneLabel}</small>
      </article>
    `;
  }).join("");

  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$("#budgets .progress span[data-target]").forEach((span, i) => {
      span.style.setProperty('--progress-delay', `${i * 120 + 80}ms`);
      span.style.width = span.dataset.target;
    });
  }));
}

function renderTxList() {
  const el = $("#txList");
  if (!el) return;
  const all = state.transactions;
  let filtered = _txFilter === 'all' ? all
    : _txFilter === 'income'  ? all.filter(t => t.type === 'income')
    : _txFilter === 'expense' ? all.filter(t => t.type === 'expense')
    : all.filter(t => t.category === _txFilter);
  if (_txSearch.trim()) {
    const q = _txSearch.toLowerCase();
    filtered = filtered.filter(t =>
      t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
    );
  }
  el.innerHTML = filtered.length === 0
    ? `<div class="empty-state">No transactions match${_txSearch ? ` "${_txSearch}"` : ' this filter'}.</div>`
    : filtered.slice(0, 30).map(item => `
        <div class="list-row list-row-clickable" data-tx-id="${item.id}">
          <span>
            <b>${item.title}</b>${item.status === 'disputed' ? ' <span class="badge-dispute">Disputed</span>' : ''}
            <br><small>${item.category} · ${item.date}${item.receiptId ? ` · <span class="mono">${item.receiptId}</span>` : ''}${item.note ? ` · ${item.note}` : ''}</small>
          </span>
          <strong class="${item.amount >= 0 ? 'positive' : 'negative'}">${item.amount >= 0 ? '+' : ''}${money(item.amount)}</strong>
        </div>`).join('');
}

function showTxDetail(txId) {
  const tx = state?.transactions.find(t => t.id === txId);
  if (!tx) return;
  _activeTxId = txId;
  const nameEl = $('#txDetailName');
  if (nameEl) nameEl.textContent = tx.title;
  const rowsEl = $('#txDetailRows');
  if (rowsEl) {
    rowsEl.innerHTML = [
      ['Amount',   `<strong class="${tx.amount >= 0 ? 'positive' : 'negative'}">${tx.amount >= 0 ? '+' : ''}${money(tx.amount)}</strong>`],
      ['Category', `<strong>${tx.category}</strong>`],
      ['Date',     `<strong>${tx.date}</strong>`],
      ...(tx.receiptId ? [['Receipt ID', `<strong class="mono">${tx.receiptId}</strong>`]] : []),
    ].map(([l, v]) => `<div class="review-row"><span>${l}</span>${v}</div>`).join('');
  }
  const noteEl = $('#txDetailNote');
  if (noteEl) noteEl.value = tx.note || '';
  const catEl  = $('#txDetailCategory');
  if (catEl)  catEl.value  = tx.category || '';
  const disputeNote = $('#txDetailDisputeNote');
  if (disputeNote) disputeNote.classList.toggle('hidden', tx.status !== 'disputed');
  const disputeBtn = $('#txDetailDisputeBtn');
  if (disputeBtn) disputeBtn.textContent = tx.status === 'disputed' ? 'Remove dispute flag' : 'Flag as dispute';
  $('#txDetailOverlay')?.classList.remove('hidden');
}

function renderSavings() {
  $("#flexibleSavings").textContent = money(state.savings.flexible);
  $("#fixedSavings").textContent    = money(state.savings.fixed);

  $("#goals").innerHTML = state.savings.goals.map(goal => {
    const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
    return `
      <article class="goal-card">
        <div class="goal-card-header">
          <div>
            <h3>${goal.name}</h3>
            <p>${money(goal.current)} saved of ${money(goal.target)}</p>
          </div>
          <div class="goal-actions">
            <button class="button ghost small" data-goal-contribute="${goal.id}">Add funds</button>
            <button class="button ghost small" data-goal-edit="${goal.id}" data-goal-name="${goal.name}" data-goal-target="${goal.target}">Edit</button>
            <button class="button ghost small danger-text" data-goal-delete="${goal.id}">✕</button>
          </div>
        </div>
        <div class="progress">
          <span style="width:0%" data-target="${pct}%"></span>
        </div>
        <small>${pct}% complete · ${money(goal.target - goal.current)} to go</small>
      </article>
    `;
  }).join("") || `<div class="empty-state">No goals yet. Create one above.</div>`;

  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$("#goals .progress span[data-target]").forEach((span, i) => {
      span.style.setProperty('--progress-delay', `${i * 120 + 80}ms`);
      span.style.width = span.dataset.target;
    });
  }));
}

function metalValue() {
  const gold = state.metals.gold * (state.settings.goldAud / 31.1035);
  const silver = state.metals.silver * (state.settings.silverAud / 31.1035);
  return gold + silver;
}

function renderMetals() {
  const goldVal   = state.metals.gold   * (state.settings.goldAud   / 31.1035);
  const silverVal = state.metals.silver * (state.settings.silverAud / 31.1035);
  $("#metalValue").textContent    = money(goldVal + silverVal);
  $("#metalHoldings").textContent = `${state.metals.gold.toFixed(2)}g gold + ${state.metals.silver.toFixed(2)}g silver`;

  const bd = $("#metalBreakdown");
  if (bd) {
    bd.innerHTML = [
      { sym: 'Au', label: 'Gold',   grams: state.metals.gold,   spotAud: state.settings.goldAud,   val: goldVal   },
      { sym: 'Ag', label: 'Silver', grams: state.metals.silver, spotAud: state.settings.silverAud, val: silverVal },
    ].map(m => `
      <div class="metal-holding-row">
        <span class="metal-sym-badge ${m.sym === 'Au' ? 'gold' : 'silver'}">${m.sym}</span>
        <div class="metal-holding-detail">
          <strong>${m.label}</strong>
          <small>${m.grams.toFixed(2)}g · ${money(m.val)}</small>
        </div>
        <div class="metal-spot-col">
          <span>${money(m.spotAud / 31.1035)}/g</span>
        </div>
      </div>`).join('');
  }

  updateMetalEstimate();
}

function updateMetalEstimate() {
  if (!state) return;
  const grams    = Number($("#metalGrams")?.value || 0);
  const isBuy    = _metalAction === 'buy';
  const metal    = _metalType;
  const spotAud  = metal === 'gold' ? state.settings.goldAud : state.settings.silverAud;
  const spotPg   = spotAud / 31.1035;  /* spot price per gram */
  const spreadPct = isBuy
    ? (state.settings.metalBuySpreadPct  || 0.75)
    : (state.settings.metalSellSpreadPct || 0.50);
  const spreadPg = spotPg * (spreadPct / 100);
  const fee      = state.settings.metalFee || 0.99;

  const panel = $("#metalEstimatePanel");
  const btn   = $("#metalConfirmBtn");
  const note  = $("#metalActionNote");

  if (!panel) return;

  if (!grams) {
    panel.innerHTML = `<p class="form-note">Enter grams to see estimate</p>`;
    if (btn) { btn.textContent = isBuy ? 'Buy →' : 'Sell →'; btn.disabled = true; }
    if (note) note.textContent = '';
    return;
  }

  let price, insufficient;
  if (isBuy) {
    price = (spotPg + spreadPg) * grams + fee;
    insufficient = price > state.user.balance;
  } else {
    price = (spotPg - spreadPg) * grams - fee;
    const held = metal === 'gold' ? state.metals.gold : state.metals.silver;
    insufficient = grams > held || price <= 0;
  }

  panel.innerHTML = `
    <div class="estimate-breakdown">
      <div class="est-row"><span>Spot (${grams}g)</span><span>${money(spotPg * grams)}</span></div>
      <div class="est-row"><span>${isBuy ? 'Buy' : 'Sell'} spread (${spreadPct}%)</span>
        <span class="${isBuy ? 'est-cost' : 'est-gain'}">${isBuy ? '−' : '−'}${money(Math.abs(spreadPg * grams))}</span></div>
      <div class="est-row"><span>Service fee</span><span class="est-cost">−${money(fee)}</span></div>
      <div class="est-row est-total">
        <span>${isBuy ? 'Total cost' : 'You receive'}</span>
        <strong>${money(Math.max(0, isBuy ? price : price))}</strong>
      </div>
    </div>`;

  if (btn) {
    btn.textContent = isBuy
      ? `Buy ${grams}g ${metal} - ${money(price)} →`
      : `Sell ${grams}g ${metal} - receive ${money(Math.max(0, price))} →`;
    btn.disabled = insufficient;
  }

  if (note) {
    if (isBuy && price > state.user.balance) {
      note.textContent = `Insufficient balance. Available: ${money(state.user.balance)}.`;
    } else if (!isBuy) {
      const held = metal === 'gold' ? state.metals.gold : state.metals.silver;
      if (grams > held) note.textContent = `You only hold ${held.toFixed(2)}g ${metal}.`;
      else if (price <= 0) note.textContent = "Amount too small after fees.";
      else note.textContent = '';
    } else {
      note.textContent = '';
    }
  }
}

function renderSplits() {
  const all      = state.splits;
  const filtered = _splitFilter === 'all'     ? all
                 : _splitFilter === 'owe'     ? all.filter(s => s.status === 'owe')
                 : _splitFilter === 'owed'    ? all.filter(s => s.status === 'owed')
                 : all.filter(s => s.status === 'settled');

  $("#splits").innerHTML = filtered.length === 0
    ? `<div class="empty-state">No splits in this category.</div>`
    : filtered.map(split => {
        const isOwe     = split.status === 'owe';
        const isOwed    = split.status === 'owed';
        const isSettled = split.status === 'settled';
        const parts     = split.participants || [];
        const partHtml  = parts.length > 1
          ? `<div class="split-participants">${parts.map(p =>
              `<span class="split-p-chip${p.paid ? '' : ' unpaid'}">${p.name} ${money(p.share)}${p.paid ? '' : ' ⧖'}</span>`
            ).join('')}</div>`
          : '';
        return `
          <div class="list-row split-list-row">
            <div>
              <b>${split.name}</b>
              <small>with ${split.friend}${split.totalAmount ? ` · Total ${money(split.totalAmount)}` : ''}</small>
              ${partHtml}
            </div>
            <div class="split-row-right">
              <strong class="${isOwe ? 'negative' : isOwed ? 'positive' : ''}">${isOwe ? '−' : isOwed ? '+' : ''}${money(split.amount)}</strong>
              <span class="split-badge ${isOwe ? 'badge-owe' : isOwed ? 'badge-owed' : 'badge-settled'}">${isOwe ? 'You owe' : isOwed ? 'Owed to you' : 'Settled'}</span>
              ${isOwe  ? `<button class="button soft small" data-settle="${split.id}">Settle now</button>` : ''}
              ${isOwed ? `<button class="button ghost small" data-remind="${split.id}">Remind</button>` : ''}
            </div>
          </div>`;
      }).join('');

  const totalOwe  = all.filter(s => s.status === 'owe' ).reduce((n, s) => n + s.amount, 0);
  const totalOwed = all.filter(s => s.status === 'owed').reduce((n, s) => n + s.amount, 0);
  const net       = totalOwed - totalOwe;
  const summary   = $("#splitSummary");
  if (summary && all.length) {
    summary.innerHTML = `
      <div class="split-net">
        <span>You owe <strong class="negative">−${money(totalOwe)}</strong></span>
        <span>Owed to you <strong class="positive">+${money(totalOwed)}</strong></span>
        <span>Net <strong class="${net >= 0 ? 'positive' : 'negative'}">${net >= 0 ? '+' : ''}${money(net)}</strong></span>
      </div>`;
  }
}

function renderCard() {
  const card = state.card;
  $("#cardLast4").textContent = card.last4;
  $("#cardHolder").textContent = card.holder;
  $("#cardStatus").textContent = card.status;
  $("#cardPreviewStatus").textContent = card.status;
  $("#pinValue").textContent = "****";
  $("#cvvValue").textContent = "***";
  $("#dailyLimit").textContent = money(card.dailyLimit);
  const limitInput = $("#newDailyLimit");
  if (limitInput && !limitInput.value) limitInput.placeholder = String(card.dailyLimit);
  $("#freezeBtn").textContent = card.frozen ? "Unfreeze card" : "Freeze card";
  $("#vaultCard").classList.toggle("frozen", card.frozen);
  const replBtn = $("#requestReplacementBtn");
  if (replBtn) {
    replBtn.textContent = card.replacementRequested
      ? `Replacement requested ✓${card.replacementEta ? ` · ETA ${card.replacementEta}` : ''}`
      : "Request replacement";
    replBtn.disabled = !!card.replacementRequested;
  }
  /* Block sensitive actions while frozen (except freeze/unfreeze & replacement) */
  const frozenMsg = card.frozen ? "Unfreeze your card first." : "";
  [$("#revealPinBtn"), $("#revealCvvBtn"), $("#saveLimitBtn"), $("#changePinBtn")].forEach(btn => {
    if (!btn) return;
    btn.disabled = card.frozen;
    btn.title    = frozenMsg;
  });
}

function renderCardTxList() {
  const el = $("#cardTxList");
  if (!el || !state) return;
  const cardTx = state.transactions.filter(t =>
    t.type === 'expense' && t.category !== 'Savings' && t.category !== 'Metals' && t.category !== 'Transfer' && t.category !== 'Split'
  ).slice(0, 12);
  el.innerHTML = cardTx.length === 0
    ? `<div class="empty-state">No card transactions yet.</div>`
    : cardTx.map(item => `
        <div class="list-row">
          <span><b>${item.title}</b><br><small>${item.category} · ${item.date}</small></span>
          <strong class="negative">${money(item.amount)}</strong>
        </div>`).join('');
}

function renderProfile() {
  if (!state) return;
  const { user } = state;
  const profileName = $("#profileName");
  const profileEmail = $("#profileEmail");
  if (profileName && !profileName.value) profileName.placeholder = user.name;
  if (profileEmail && !profileEmail.value) profileEmail.placeholder = user.email;

  /* Dynamic identity / verification checklist */
  const verifyList = $("#verifyList");
  if (verifyList) {
    const id   = user.identity  || {};
    const lb   = (user.linkedBanks || [])[0];
    const rows = [
      { label: "Email verified",     note: user.email,                                              done: !!id.email  },
      { label: "Phone verified",     note: "+61 4xx xxx xxx",                                       done: !!id.phone  },
      { label: "Identity (AML/DOB)", note: id.aml ? "Passed · May 2026" : "Pending review",        done: !!id.aml    },
      { label: "Bank account linked",note: lb ? `${lb.name} ····${lb.last4}` : "No bank linked",   done: !!lb && lb.status === "active" },
    ];
    verifyList.innerHTML = rows.map(r => `
      <div class="verify-row ${r.done ? 'complete' : 'pending'}">
        <span class="verify-icon">${r.done ? '✓' : '○'}</span>
        <div><strong>${r.label}</strong><small>${r.note}</small></div>
      </div>`).join('');
  }

  /* Notification preferences */
  const notifPanel = $("#notificationsPanel");
  if (notifPanel) {
    const prefs = user.notifications || {};
    notifPanel.innerHTML = [
      { key: "transfers",      label: "Transfer alerts",     note: "Notify on outgoing transfers"     },
      { key: "budgetAlerts",   label: "Budget warnings",     note: "Alert when near spending limit"   },
      { key: "savingsUpdates", label: "Savings updates",     note: "Monthly savings summary"          },
      { key: "securityAlerts", label: "Security alerts",     note: "Login, PIN changes, replacements" },
    ].map(p => `
      <label class="notif-row">
        <div><strong>${p.label}</strong><small>${p.note}</small></div>
        <input type="checkbox" id="notif-${p.key}" class="notif-check" ${prefs[p.key] ? 'checked' : ''} />
      </label>`).join('');
  }

  /* Linked banks panel */
  const lbPanel = $("#linkedBanksList");
  if (lbPanel) {
    const banks = user.linkedBanks || [];
    lbPanel.innerHTML = banks.length === 0
      ? `<div class="verify-row pending"><span class="verify-icon">○</span><div><strong>No bank linked</strong><small>Contact support to link your account.</small></div></div>`
      : banks.map(lb => `
          <div class="verify-row ${lb.status === 'active' ? 'complete' : 'pending'}">
            <span class="verify-icon">${lb.status === 'active' ? '✓' : '○'}</span>
            <div>
              <strong>${lb.name}</strong>
              <small>BSB ${lb.bsb} · ····${lb.last4} · ${lb.status}</small>
            </div>
          </div>`).join('');
  }
}

function renderHomeSnapshot() {
  const el = $("#homeSnapshot");
  if (!el || !state) return;

  const inv = state.investments || { crypto: [] };
  const savingsTotal = state.savings.flexible + state.savings.fixed;
  const metalsVal    = metalValue();
  const cryptoVal    = inv.crypto.filter(c => c.quantity > 0)
    .reduce((s, c) => s + c.quantity * livePrice(c.symbol), 0);
  const pendingSplits = state.splits.filter(s => s.status === 'owe');
  const pendingAmt    = pendingSplits.reduce((n, s) => n + s.amount, 0);
  const dailyLimit    = state.card?.dailyLimit || 5000;
  const todaySpent    = state.transactions
    .filter(t => (t.date === 'Today' || t.date === 'Just now') && t.category === 'Transfer')
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const dailyRemaining = Math.max(0, dailyLimit - todaySpent);

  const cards = [
    { label: 'Savings',      value: money(savingsTotal),   note: 'Flexible + Fixed' },
    { label: 'Metals',       value: money(metalsVal),      note: 'Au + Ag holdings' },
    { label: 'Invested',     value: money(cryptoVal),      note: 'Crypto portfolio' },
    {
      label: 'Pending splits',
      value: pendingSplits.length ? `${pendingSplits.length} split${pendingSplits.length > 1 ? 's' : ''}` : 'None',
      note:  pendingSplits.length ? `−${money(pendingAmt)} to settle` : 'All clear',
      cls:   pendingSplits.length ? 'negative' : ''
    },
    { label: 'Daily limit',  value: money(dailyRemaining), note: `of ${money(dailyLimit)} left today` },
  ];

  el.innerHTML = cards.map(c => `
    <div class="home-snap-card">
      <small>${c.label}</small>
      <strong class="${c.cls || ''}">${c.value}</strong>
      <span>${c.note}</span>
    </div>`).join('');
}

/* ══════════════════════════════════════════════════════════════════════════
   INVEST TAB
   ══════════════════════════════════════════════════════════════════════════ */

/* Seeded pseudo-random number generator for deterministic chart data */
function seededRand(seed) {
  let s = seed >>> 0;
  return function () {
    s = Math.imul(1664525, s) + 1013904223 >>> 0;
    return s / 0xFFFFFFFF;
  };
}

/* Generate a price walk from startPrice toward endPrice with noise */
function genPriceHistory(startPrice, endPrice, points, volatility, seed) {
  const rand = seededRand(seed || 12345);
  const data = [];
  let price = startPrice;
  const drift = (endPrice - startPrice) / points;
  for (let i = 0; i < points; i++) {
    price += drift + (rand() - 0.5) * price * volatility;
    data.push(Math.max(0.01, price));
  }
  return data;
}

/* Build date/time labels for a given time range and point count */
function buildChartLabels(range, points) {
  const now = new Date();
  const labels = [];
  if (range === '1D') {
    for (let i = points - 1; i >= 0; i--) {
      const d = new Date(now - i * 60 * 60 * 1000);
      labels.push(d.getHours().toString().padStart(2, '0') + ':00');
    }
  } else if (range === '1W') {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    for (let i = points - 1; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      labels.push(days[d.getDay()]);
    }
  } else if (range === '1M') {
    for (let i = points - 1; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      labels.push(`${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`);
    }
  } else if (range === '3M') {
    for (let i = points - 1; i >= 0; i--) {
      const d = new Date(now - i * 7 * 24 * 60 * 60 * 1000);
      labels.push(`${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`);
    }
  } else if (range === '1Y') {
    for (let i = points - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      labels.push(d.toLocaleString('default', { month: 'short' }));
    }
  } else {
    for (let i = points - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i * 2);
      labels.push(`${d.toLocaleString('default', { month: 'short' })} '${String(d.getFullYear()).slice(2)}`);
    }
  }
  return labels;
}

/* Map time range to { points, volatility } per asset type */
const RANGE_CONFIG = {
  '1D':  { points: 24,  vol: { high: 0.004, med: 0.003, low: 0.001 } },
  '1W':  { points: 7,   vol: { high: 0.025, med: 0.018, low: 0.005 } },
  '1M':  { points: 30,  vol: { high: 0.020, med: 0.015, low: 0.004 } },
  '3M':  { points: 12,  vol: { high: 0.030, med: 0.022, low: 0.007 } },
  '1Y':  { points: 12,  vol: { high: 0.060, med: 0.040, low: 0.015 } },
  'all': { points: 24,  vol: { high: 0.080, med: 0.060, low: 0.025 } }
};

/* Current live price for any asset symbol */
function livePrice(symbol) {
  if (!_liveMarketPrices) _liveMarketPrices = { ...((state && state.marketPrices) || {}) };
  const lc = symbol.toLowerCase();
  if (lc === 'gold')   return _liveMarketPrices.gold?.aud   || (state?.settings?.goldAud   || 3318.2);
  if (lc === 'silver') return _liveMarketPrices.silver?.aud || (state?.settings?.silverAud || 38.4);
  return _liveMarketPrices[symbol]?.aud || 0;
}

/* Build historical start price: avg buy price or a rough estimate */
function historyStartPrice(symbol, currentPrice, range) {
  const inv = state?.investments?.crypto || [];
  const holding = inv.find(c => c.symbol === symbol.toUpperCase());
  if (holding && holding.averageBuyPrice && holding.averageBuyPrice < currentPrice) {
    const ranges = ['1D','1W','1M','3M','1Y','all'];
    const ratios  = [0.99, 0.97, 0.93, 0.88, 0.75, 0.65];
    const factor  = ratios[ranges.indexOf(range)] ?? 0.85;
    return holding.averageBuyPrice * (currentPrice / (holding.averageBuyPrice || currentPrice)) * factor;
  }
  const rangeFactor = { '1D':0.99, '1W':0.96, '1M':0.90, '3M':0.84, '1Y':0.70, 'all':0.60 };
  return currentPrice * (rangeFactor[range] || 0.85);
}

function renderInvestChart() {
  const canvas = document.getElementById('investChart');
  if (!canvas || typeof Chart === 'undefined') return;
  const cfg = RANGE_CONFIG[_investTimeRange] || RANGE_CONFIG['1M'];
  const labels = buildChartLabels(_investTimeRange, cfg.points);

  /* Destroy previous chart if it exists */
  if (_investChart) { _investChart.destroy(); _investChart = null; }

  const roseColor  = '#9c6270';
  const goldColor  = '#e8c9a0';
  const blueColor  = '#5b8fa8';
  const greenColor = '#2bc985';
  const ctx        = canvas.getContext('2d');

  /* ── Donut: asset allocation ───────────────────────────────────────── */
  if (_investChartType === 'donut') {
    const inv     = state.investments || { crypto: [] };
    const prices  = _liveMarketPrices || {};
    const goldVal  = state.metals.gold   * (livePrice('gold')   / 31.1035);
    const silverVal = state.metals.silver * (livePrice('silver') / 31.1035);
    const cryptoItems = inv.crypto.filter(c => c.quantity > 0);
    const items = [
      { label: 'Gold',   value: goldVal,   color: '#e8c9a0' },
      { label: 'Silver', value: silverVal, color: '#b0bec5' },
      ...cryptoItems.map((c, i) => ({
        label: c.name,
        value: c.quantity * livePrice(c.symbol),
        color: ['#f2a65a', '#5b8fa8', '#2bc985', '#9c6270'][i % 4]
      }))
    ].filter(i => i.value > 0);

    _investChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: items.map(i => i.label),
        datasets: [{ data: items.map(i => i.value), backgroundColor: items.map(i => i.color), borderWidth: 0, hoverOffset: 8 }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'right', labels: { color: '#5c2e38', font: { family: 'Inter' } } },
          tooltip: { callbacks: { label: ctx => ` ${money(ctx.raw)} (${((ctx.raw / items.reduce((s,i) => s+i.value,0))*100).toFixed(1)}%)` } }
        }
      }
    });
    return;
  }

  /* ── Bar: monthly buy/sell activity ───────────────────────────────── */
  if (_investChartType === 'bar') {
    const hist = (state.investments?.history || []).slice(0, 20);
    const months = {};
    hist.forEach(h => {
      const m = (h.date || '').slice(0, 7);
      if (!m) return;
      months[m] ||= { buy: 0, sell: 0 };
      const val = h.quantity * h.price;
      if (h.type === 'buy')  months[m].buy  += val;
      if (h.type === 'sell') months[m].sell += val;
    });
    const sortedMonths = Object.keys(months).sort();
    const barLabels = sortedMonths.map(m => { const d = new Date(m+'-01'); return d.toLocaleString('default',{month:'short', year:'2-digit'}); });
    _investChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: barLabels.length ? barLabels : ['No activity'],
        datasets: [
          { label: 'Bought', data: sortedMonths.map(m => months[m].buy),  backgroundColor: greenColor, borderRadius: 6 },
          { label: 'Sold',   data: sortedMonths.map(m => months[m].sell), backgroundColor: roseColor,  borderRadius: 6 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#5c2e38', font: { family: 'Inter' } } }, tooltip: { callbacks: { label: ctx => ` ${money(ctx.raw)}` } } },
        scales: {
          x: { ticks: { color: '#9c6270' }, grid: { display: false } },
          y: { ticks: { color: '#9c6270', callback: v => '$'+v.toLocaleString() }, grid: { color: 'rgba(219,168,160,0.15)' } }
        }
      }
    });
    return;
  }

  /* ── Compare: BTC vs Gold vs Silver (normalised to 100) ───────────── */
  if (_investChartType === 'compare') {
    const assets = [
      { symbol: 'BTC',    label: 'Bitcoin',   color: '#f2a65a', vol: 'high' },
      { symbol: 'gold',   label: 'Gold',      color: '#e8c9a0', vol: 'low'  },
      { symbol: 'silver', label: 'Silver',    color: '#b0bec5', vol: 'low'  },
    ];
    const datasets = assets.map((a, ai) => {
      const cur   = livePrice(a.symbol);
      const start = historyStartPrice(a.symbol, cur, _investTimeRange);
      const prices = genPriceHistory(start, cur, cfg.points, cfg.vol[a.vol], ai * 7777 + 1111);
      const base   = prices[0] || 1;
      return {
        label: a.label,
        data:  prices.map(p => Number(((p / base) * 100).toFixed(2))),
        borderColor: a.color,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4
      };
    });
    _investChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: '#5c2e38', font: { family: 'Inter' } } }, tooltip: { callbacks: { label: ctx => ` ${ctx.formattedValue} (base 100)` } } },
        scales: {
          x: { ticks: { color: '#9c6270', maxTicksLimit: 6 }, grid: { display: false } },
          y: { ticks: { color: '#9c6270' }, grid: { color: 'rgba(219,168,160,0.15)' } }
        }
      }
    });
    return;
  }

  /* ── Line / Area: single or portfolio ─────────────────────────────── */
  let chartData, lineLabel, lineColor;

  if (_investAsset === 'portfolio' || _investAsset === 'metals' || _investAsset === 'crypto') {
    /* Sum all relevant holdings over time */
    const inv = state.investments || { crypto: [] };
    const goldVal   = state.metals.gold   * (livePrice('gold')   / 31.1035);
    const silverVal = state.metals.silver * (livePrice('silver') / 31.1035);
    const cryptoVal = inv.crypto.filter(c=>c.quantity>0).reduce((s,c) => s + c.quantity * livePrice(c.symbol), 0);

    let totalCur;
    if (_investAsset === 'metals')  totalCur = goldVal + silverVal;
    else if (_investAsset === 'crypto') totalCur = cryptoVal;
    else totalCur = goldVal + silverVal + cryptoVal;

    const totalStart = totalCur * ({ '1D':0.99,'1W':0.96,'1M':0.90,'3M':0.84,'1Y':0.70,'all':0.60 }[_investTimeRange] || 0.90);
    chartData  = genPriceHistory(totalStart, totalCur, cfg.points, cfg.vol.med, 99999);
    lineLabel  = _investAsset === 'metals' ? 'Metals portfolio' : _investAsset === 'crypto' ? 'Crypto portfolio' : 'Total portfolio';
    lineColor  = roseColor;
  } else if (_investAsset === 'watchlist') {
    const wl = (state.investments?.crypto || []).filter(c => c.watchlist);
    const totalCur = wl.reduce((s, c) => s + c.quantity * livePrice(c.symbol), 0) || 1000;
    chartData = genPriceHistory(totalCur * 0.90, totalCur, cfg.points, cfg.vol.med, 55555);
    lineLabel = 'Watchlist value'; lineColor = blueColor;
  } else {
    /* Single asset */
    const sym = _investAsset;
    const isLower = ['gold','silver'].includes(sym.toLowerCase());
    const cur   = livePrice(sym);
    const start = historyStartPrice(sym, cur, _investTimeRange);
    const vol   = ['BTC','ETH'].includes(sym.toUpperCase()) ? cfg.vol.high : cfg.vol.low;
    const seed  = sym.split('').reduce((s,c,i) => s + c.charCodeAt(0) * (i+1), 0);
    chartData   = genPriceHistory(start, cur, cfg.points, vol, seed);
    lineLabel   = sym.toUpperCase() === 'BTC' ? 'Bitcoin (AUD)' : sym.toUpperCase() === 'ETH' ? 'Ethereum (AUD)' : sym.charAt(0).toUpperCase()+sym.slice(1)+' /g (AUD)';
    lineColor   = sym.toUpperCase() === 'BTC' ? '#f2a65a' : sym.toUpperCase() === 'ETH' ? blueColor : goldColor;
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, lineColor + '55');
  gradient.addColorStop(1, lineColor + '00');

  _investChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: lineLabel,
        data: chartData,
        borderColor: lineColor,
        backgroundColor: _investChartType === 'area' ? gradient : 'transparent',
        fill: _investChartType === 'area',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#5c2e38', font: { family: 'Inter' } } },
        tooltip: { callbacks: { label: ctx => ` ${money(ctx.raw)}` } }
      },
      scales: {
        x: { ticks: { color: '#9c6270', maxTicksLimit: 6 }, grid: { display: false } },
        y: { ticks: { color: '#9c6270', callback: v => '$'+Number(v.toFixed(0)).toLocaleString() }, grid: { color: 'rgba(219,168,160,0.15)' } }
      }
    }
  });
}

function renderInvestHoldings() {
  const el = document.getElementById('investHoldingsList');
  if (!el || !state) return;
  const inv = state.investments || { crypto: [] };
  const rows = [];

  /* Metals */
  const goldPg   = livePrice('gold')   / 31.1035;
  const silverPg = livePrice('silver') / 31.1035;
  if (state.metals.gold > 0) {
    const val  = state.metals.gold * goldPg;
    const cost = state.metals.gold * (state.settings.goldAud / 31.1035);
    const gl   = val - cost;
    rows.push(`
      <div class="invest-holding-row" data-invest-asset="gold">
        <span class="invest-hold-sym gold-sym">Au</span>
        <div class="invest-hold-info">
          <strong>Gold</strong>
          <small>${state.metals.gold.toFixed(2)}g · ${money(goldPg)}/g</small>
        </div>
        <div class="invest-hold-value">
          <strong>${money(val)}</strong>
          <small class="${gl >= 0 ? 'positive' : 'negative'}">${gl >= 0 ? '+' : ''}${money(gl)}</small>
        </div>
      </div>`);
  }
  if (state.metals.silver > 0) {
    const val  = state.metals.silver * silverPg;
    const cost = state.metals.silver * (state.settings.silverAud / 31.1035);
    const gl   = val - cost;
    rows.push(`
      <div class="invest-holding-row" data-invest-asset="silver">
        <span class="invest-hold-sym silver-sym">Ag</span>
        <div class="invest-hold-info">
          <strong>Silver</strong>
          <small>${state.metals.silver.toFixed(2)}g · ${money(silverPg)}/g</small>
        </div>
        <div class="invest-hold-value">
          <strong>${money(val)}</strong>
          <small class="${gl >= 0 ? 'positive' : 'negative'}">${gl >= 0 ? '+' : ''}${money(gl)}</small>
        </div>
      </div>`);
  }

  /* Crypto */
  inv.crypto.forEach(c => {
    const price = livePrice(c.symbol);
    const val   = c.quantity * price;
    const cost  = c.quantity * (c.averageBuyPrice || 0);
    const gl    = val - cost;
    const sym   = c.symbol.toUpperCase();
    rows.push(`
      <div class="invest-holding-row" data-invest-asset="${sym}">
        <span class="invest-hold-sym crypto-sym">${sym.slice(0, 3)}</span>
        <div class="invest-hold-info">
          <strong>${c.name}${c.watchlist && c.quantity < 0.000001 ? ' <small>(watchlist)</small>' : ''}</strong>
          <small>${c.quantity > 0 ? c.quantity.toFixed(6)+' '+sym+' · ' : ''}${money(price)}</small>
        </div>
        <div class="invest-hold-value">
          ${c.quantity > 0 ? `<strong>${money(val)}</strong><small class="${gl >= 0 ? 'positive' : 'negative'}">${gl >= 0 ? '+' : ''}${money(gl)}</small>` : `<small>Watching</small>`}
        </div>
      </div>`);
  });

  el.innerHTML = rows.length
    ? rows.join('')
    : `<div class="empty-state">No holdings yet. Buy an asset to get started.</div>`;

  /* Click to select asset detail */
  el.querySelectorAll('[data-invest-asset]').forEach(row => {
    row.addEventListener('click', () => {
      _investAsset = row.dataset.investAsset;
      document.querySelectorAll('#assetSelector button').forEach(b => b.classList.toggle('active', b.dataset.investAsset === _investAsset));
      renderAssetDetail();
      renderInvestChart();
    });
  });
}

function renderAssetDetail() {
  const nameEl   = document.getElementById('assetDetailName');
  const dlEl     = document.getElementById('investDetailDl');
  const actionEl = document.getElementById('investActionRow');
  if (!nameEl || !dlEl || !actionEl || !state) return;

  const inv = state.investments || { crypto: [] };
  const sym = _investAsset.toUpperCase();
  const isGold   = _investAsset === 'gold';
  const isSilver = _investAsset === 'silver';
  const isMetal  = isGold || isSilver;
  const isCrypto = ['BTC','ETH'].includes(sym) || (!isMetal && _investAsset !== 'portfolio' && _investAsset !== 'metals' && _investAsset !== 'crypto' && _investAsset !== 'watchlist');

  if (_investAsset === 'portfolio' || _investAsset === 'metals' || _investAsset === 'crypto' || _investAsset === 'watchlist') {
    nameEl.textContent = _investAsset === 'portfolio' ? 'Total Portfolio' : _investAsset === 'metals' ? 'Metals' : _investAsset === 'crypto' ? 'Crypto' : 'Watchlist';
    dlEl.innerHTML = `<div class="empty-state" style="margin:0">Click a specific asset below to see details and trade.</div>`;
    actionEl.innerHTML = '';
    return;
  }

  if (isMetal) {
    const grams   = isGold ? state.metals.gold : state.metals.silver;
    const spotAud = isGold ? livePrice('gold') : livePrice('silver');
    const spotPg  = spotAud / 31.1035;
    const val     = grams * spotPg;
    const cost    = grams * ((isGold ? state.settings.goldAud : state.settings.silverAud) / 31.1035);
    const gl      = val - cost;
    nameEl.textContent = isGold ? 'Gold (Au)' : 'Silver (Ag)';
    dlEl.innerHTML = `
      <div class="invest-dl-row"><dt>Spot price</dt><dd>${money(spotPg)}/g</dd></div>
      <div class="invest-dl-row"><dt>Holdings</dt><dd>${grams.toFixed(2)}g</dd></div>
      <div class="invest-dl-row"><dt>Current value</dt><dd>${money(val)}</dd></div>
      <div class="invest-dl-row"><dt>Gain / loss</dt><dd class="${gl >= 0 ? 'positive' : 'negative'}">${gl >= 0 ? '+' : ''}${money(gl)}</dd></div>`;
    actionEl.innerHTML = `<p class="form-note" style="margin:0">Trade metals in the <b>Metals</b> tab.</p>`;
    return;
  }

  if (isCrypto) {
    const price    = livePrice(sym);
    const holding  = inv.crypto.find(c => c.symbol === sym) || { quantity: 0, averageBuyPrice: price, watchlist: false };
    const val      = holding.quantity * price;
    const cost     = holding.quantity * (holding.averageBuyPrice || 0);
    const gl       = val - cost;
    const glPct    = cost > 0 ? ((gl / cost) * 100).toFixed(2) : '0.00';
    const isWl     = holding.watchlist;
    const cryptoNames = { BTC: 'Bitcoin', ETH: 'Ethereum' };
    nameEl.textContent = cryptoNames[sym] || sym;
    dlEl.innerHTML = `
      <div class="invest-dl-row"><dt>Current price</dt><dd>${money(price)}</dd></div>
      <div class="invest-dl-row"><dt>Holdings</dt><dd>${holding.quantity > 0 ? holding.quantity.toFixed(6)+' '+sym : 'None'}</dd></div>
      <div class="invest-dl-row"><dt>Avg buy price</dt><dd>${holding.quantity > 0 ? money(holding.averageBuyPrice) : '-'}</dd></div>
      <div class="invest-dl-row"><dt>Current value</dt><dd>${holding.quantity > 0 ? money(val) : '-'}</dd></div>
      <div class="invest-dl-row"><dt>Gain / loss</dt><dd class="${gl >= 0 ? 'positive' : 'negative'}">${holding.quantity > 0 ? (gl >= 0 ? '+' : '')+money(gl)+' ('+glPct+'%)' : '-'}</dd></div>`;
    actionEl.innerHTML = `
      <button class="button primary small" data-invest-buy="${sym}" data-invest-name="${cryptoNames[sym]||sym}">Buy</button>
      ${holding.quantity > 0 ? `<button class="button soft small" data-invest-sell="${sym}" data-invest-name="${cryptoNames[sym]||sym}">Sell</button>` : ''}
      <button class="button ghost small" data-invest-watchlist="${sym}" data-invest-name="${cryptoNames[sym]||sym}" data-invest-wl-active="${isWl}">${isWl ? '- Watchlist' : '+ Watchlist'}</button>`;
    return;
  }

  nameEl.textContent = 'Select an asset';
  dlEl.innerHTML = `<div class="empty-state" style="margin:0">Click a holding to see details.</div>`;
  actionEl.innerHTML = '';
}

function renderInvest() {
  if (!state) return;

  /* Init live prices from state on first load */
  if (!_liveMarketPrices) {
    _liveMarketPrices = JSON.parse(JSON.stringify(state.marketPrices || {}));
  } else {
    /* Update BTC/ETH from state if server returned fresh values (after buy/sell) */
    Object.keys(state.marketPrices || {}).forEach(k => {
      if (!_liveMarketPrices[k]) _liveMarketPrices[k] = { ...state.marketPrices[k] };
    });
  }

  const inv      = state.investments || { crypto: [] };
  const goldPg   = livePrice('gold')   / 31.1035;
  const silverPg = livePrice('silver') / 31.1035;
  const goldVal   = state.metals.gold   * goldPg;
  const silverVal = state.metals.silver * silverPg;
  const cryptoVal = inv.crypto.filter(c => c.quantity > 0).reduce((s, c) => s + c.quantity * livePrice(c.symbol), 0);
  const totalVal  = goldVal + silverVal + cryptoVal;

  /* Cost basis for gain/loss */
  const goldCost   = state.metals.gold   * (state.settings.goldAud   / 31.1035);
  const silverCost = state.metals.silver * (state.settings.silverAud / 31.1035);
  const cryptoCost = inv.crypto.filter(c => c.quantity > 0).reduce((s, c) => s + c.quantity * (c.averageBuyPrice || 0), 0);
  const totalCost  = goldCost + silverCost + cryptoCost;
  const gainLoss   = totalVal - totalCost;

  /* Simulate daily change as 0.3-1.5% random (seeded to today's date) */
  const todaySeed  = new Date().toDateString().split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const dayChange  = totalVal * (seededRand(todaySeed)() * 0.018 - 0.004);

  /* Risk label: crypto > 40% = High, crypto > 15% = Medium, else Low */
  const cryptoPct = totalVal > 0 ? cryptoVal / totalVal : 0;
  const riskLabel = cryptoPct > 0.4 ? 'High' : cryptoPct > 0.15 ? 'Medium' : 'Low';
  const riskClass = cryptoPct > 0.4 ? 'risk-high' : cryptoPct > 0.15 ? 'risk-med' : 'risk-low';

  const investTotal  = document.getElementById('investTotal');
  const investChange = document.getElementById('investChange');
  const investGL     = document.getElementById('investGainLoss');
  const investCash   = document.getElementById('investCash');
  const investRisk   = document.getElementById('investRisk');

  if (investTotal)  investTotal.textContent  = money(totalVal);
  if (investChange) {
    investChange.textContent = (dayChange >= 0 ? '+' : '') + money(dayChange);
    investChange.className   = dayChange >= 0 ? 'positive' : 'negative';
  }
  if (investGL) {
    investGL.textContent = (gainLoss >= 0 ? '+' : '') + money(gainLoss);
    investGL.className   = gainLoss >= 0 ? 'positive' : 'negative';
  }
  if (investCash)   investCash.textContent  = money(state.user.balance);
  if (investRisk) {
    investRisk.textContent  = riskLabel;
    investRisk.className    = `invest-risk-badge ${riskClass}`;
  }

  renderInvestHoldings();
  renderAssetDetail();
  renderInvestChart();
}

/* Start live price ticker (client-side only, no server calls) */
function startLivePriceTick() {
  if (_liveTickTimer) return;
  _liveTickTimer = setInterval(() => {
    if (!_liveMarketPrices) return;
    const rand = Math.random;
    Object.keys(_liveMarketPrices).forEach(key => {
      if (_liveMarketPrices[key]?.aud != null) {
        const vol = ['BTC','ETH'].includes(key) ? 0.003 : 0.0008;
        _liveMarketPrices[key].aud = Number((_liveMarketPrices[key].aud * (1 + (rand() - 0.5) * vol)).toFixed(2));
      }
    });
    /* Re-render invest tab only if it is active */
    const investTab = document.getElementById('tab-invest');
    if (investTab && investTab.classList.contains('active')) {
      renderInvest();
    }
  }, 15000);
}

function renderSecurityLog() {
  const el = $("#securityLog");
  if (!el || !state) return;
  /* Only available when running on local server */
  if (USE_FIREBASE) {
    el.innerHTML = `<div class="empty-state">Security log available in local server mode.</div>`;
    return;
  }
  fetch("/api/db").then(r => r.json()).then(db => {
    const actions = db.actions.slice(0, 10);
    el.innerHTML = actions.length === 0
      ? `<div class="empty-state">No security events recorded.</div>`
      : actions.map(a => `
          <div class="list-row">
            <span><b>${a.action}</b><br><small>${a.detail}</small></span>
            <small>${new Date(a.at).toLocaleString("en-AU")}</small>
          </div>`).join('');
  }).catch(() => {
    el.innerHTML = `<div class="empty-state">Could not load security log.</div>`;
  });
}

/* ── Split form helper ───────────────────────────────────────────────── */
function updateSplitPreview() {
  const total   = Number($("#splitAmount")?.value || 0);
  const friends = ($("#splitFriends")?.value || "").split(",").map(f => f.trim()).filter(Boolean);
  const people  = ["You", ...friends];
  const detail  = $("#splitTypeDetail");
  if (!detail) return;

  if (_splitType === 'equal') {
    const share = people.length > 0 ? total / people.length : 0;
    detail.innerHTML = people.map(p => `
      <div class="split-person-row"><span>${p}</span><strong>${money(share)}</strong></div>`).join('');

  } else if (_splitType === 'custom') {
    detail.innerHTML = people.map(p => `
      <div class="split-person-row">
        <span>${p}</span>
        <div class="prefix-input"><span>$</span><input class="custom-share" data-person="${p}" type="number" placeholder="0.00" step="0.01" /></div>
      </div>`).join('');

  } else if (_splitType === 'percentage') {
    const pct = people.length > 0 ? Math.round(100 / people.length) : 0;
    detail.innerHTML = people.map(p => `
      <div class="split-person-row">
        <span>${p}</span>
        <div class="prefix-input"><span>%</span><input class="pct-share" data-person="${p}" type="number" value="${pct}" min="0" max="100" /></div>
        <small>${money(total * pct / 100)}</small>
      </div>`).join('');

  } else if (_splitType === 'itemized') {
    detail.innerHTML = `
      <div id="itemList" class="item-list">
        <div class="item-row">
          <input placeholder="Item" class="item-name" />
          <div class="prefix-input"><span>$</span><input type="number" placeholder="0.00" class="item-amt" step="0.01" /></div>
          <select class="item-person">${people.map(p => `<option>${p}</option>`).join('')}</select>
        </div>
      </div>
      <button class="button ghost" id="addItemBtn" style="margin-top:8px">+ Add item</button>`;
    $("#addItemBtn")?.addEventListener("click", () => {
      const row = document.createElement("div");
      row.className = "item-row";
      row.innerHTML = `<input placeholder="Item" class="item-name" /><div class="prefix-input"><span>$</span><input type="number" placeholder="0.00" class="item-amt" step="0.01" /></div><select class="item-person">${people.map(p => `<option>${p}</option>`).join('')}</select>`;
      $("#itemList")?.appendChild(row);
    });
  }
}

/* ── Transfer helpers ────────────────────────────────────────────────── */
function renderTransfer() {
  const el = $("#savedRecipientsList");
  if (!el) return;
  /* Prefer DB recipients; fall back to localStorage */
  const dbRecipients = state?.recipients || [];
  const lsRecipients = JSON.parse(localStorage.getItem("vaultRecipients") || "[]");
  _mergedRecipients = [...dbRecipients];
  lsRecipients.forEach(r => {
    if (!_mergedRecipients.some(m => m.name === r.name)) _mergedRecipients.push(r);
  });
  const merged = _mergedRecipients;
  el.innerHTML = merged.length === 0
    ? `<p class="form-note">No saved recipients yet. Complete a transfer with "Save recipient" checked to add one.</p>`
    : merged.map((r, i) => `
        <div class="saved-recipient">
          <div class="recipient-av">${r.name.charAt(0).toUpperCase()}</div>
          <div class="recipient-detail">
            <strong>${r.name}</strong>
            <small>${r.bsb ? `BSB ${r.bsb} · ${r.account}` : r.payid ? `PayID: ${r.payid}` : 'Saved recipient'}</small>
          </div>
          <div class="recipient-btns">
            <button class="button soft small" data-use-recipient="${i}">Send</button>
            <button class="button ghost small" data-delete-recipient="${r.name}">✕</button>
          </div>
        </div>`).join('');
}

function showTransferReview(data) {
  _pendingTransfer = data;
  _enteredPin      = '';
  const rows = $("#reviewRows");
  if (rows) {
    rows.innerHTML = Object.entries({
      'To':        data.recipientName,
      'Amount':    money(data.amount),
      'Reference': data.reference || '-',
      ...(data.bsb ? { 'BSB': data.bsb, 'Account': data.account } : { 'PayID': data.payid }),
    }).map(([label, val]) => `
      <div class="review-row"><span>${label}</span><strong>${val}</strong></div>`).join('');
  }
  renderPinPad();
  const overlay = $("#transferReviewOverlay");
  if (overlay) overlay.classList.remove("hidden");
  const pinError = $("#pinError");
  if (pinError) pinError.classList.add("hidden");
}

function renderPinPad() {
  const pad = $("#pinPad");
  if (!pad) return;
  pad.innerHTML = [1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k =>
    k === '' ? `<span class="pin-key-empty"></span>` : `<button class="pin-key" data-key="${k}">${k}</button>`
  ).join('');
  updatePinDots();
}

function updatePinDots() {
  $$("#pinDots span").forEach((dot, i) => {
    dot.className = i < _enteredPin.length ? "dot-filled" : "";
  });
  const btn = $("#confirmTransferBtn");
  if (btn) btn.disabled = _enteredPin.length < 4;
}

async function confirmTransfer() {
  const cardPin = state?.card?.pin || "4821";
  if (_enteredPin !== String(cardPin)) {
    _enteredPin = '';
    updatePinDots();
    const err = $("#pinError");
    if (err) err.classList.remove("hidden");
    return;
  }
  try {
    await postAction({
      type:          "transfer-send",
      amount:        _pendingTransfer.amount,
      recipientName: _pendingTransfer.recipientName,
      reference:     _pendingTransfer.reference,
      bsb:           _pendingTransfer.bsb    || null,
      account:       _pendingTransfer.account || null,
      payid:         _pendingTransfer.payid   || null,
      save:          _pendingTransfer.save    || false
    }, null);
    /* Use server-generated receipt ID from returned state */
    const txId = state?.transferReceipts?.[0]?.id || ("VLT" + Math.random().toString(36).slice(2, 8).toUpperCase());

    /* Also mirror to localStorage for offline/Firebase mode */
    if (_pendingTransfer.save) {
      const saved = JSON.parse(localStorage.getItem("vaultRecipients") || "[]");
      const exists = saved.some(r => r.name === _pendingTransfer.recipientName);
      if (!exists) {
        saved.unshift({
          name:    _pendingTransfer.recipientName,
          bsb:     _pendingTransfer.bsb    || null,
          account: _pendingTransfer.account || null,
          payid:   _pendingTransfer.payid   || null,
        });
        localStorage.setItem("vaultRecipients", JSON.stringify(saved.slice(0, 10)));
      }
    }

    $("#transferReviewOverlay").classList.add("hidden");
    showTransferReceipt(txId, _pendingTransfer);
  } catch (err) {
    toast(err.message);
  }
}

function showTransferReceipt(txId, data) {
  const rows = $("#receiptRows");
  if (rows) {
    rows.innerHTML = `
      <div class="review-row tx-id"><span>Transaction ID</span><strong>${txId}</strong></div>
      <div class="review-row"><span>Amount</span><strong>${money(data.amount)}</strong></div>
      <div class="review-row"><span>To</span><strong>${data.recipientName}</strong></div>
      <div class="review-row"><span>Reference</span><strong>${data.reference || '-'}</strong></div>
      <div class="review-row"><span>Status</span><strong class="positive">Sent ✓</strong></div>
      <div class="review-row"><span>Time</span><strong>${new Date().toLocaleTimeString("en-AU")}</strong></div>`;
  }
  const receipt = $("#transferReceiptOverlay");
  if (receipt) receipt.classList.remove("hidden");
}

function setActiveTab(tab) {
  $$(".app-nav button").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tab));
  $$(".tab-view").forEach(panel => panel.classList.toggle("active", panel.id === `tab-${tab}`));
}

function bindEvents() {
  $$(".auth-tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".auth-tabs button").forEach(item => item.classList.remove("active"));
      btn.classList.add("active");
      $("#loginForm").classList.toggle("hidden", btn.dataset.auth !== "login");
      $("#signupForm").classList.toggle("hidden", btn.dataset.auth !== "signup");
    });
  });

  $("#loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    try {
      const form = new FormData(event.currentTarget);
      state = await api("/api/login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form))
      });
      activeUserId = state.user.id;
      localStorage.setItem("vaultUserId", activeUserId);
      showDashboard();
      render();
      toast("Welcome back to Vault.", "success");
    } catch (error) {
      $("#authMessage").textContent = error.message;
    }
  });

  $("#signupForm").addEventListener("submit", async event => {
    event.preventDefault();
    try {
      const form = new FormData(event.currentTarget);
      state = await api("/api/signup", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(form))
      });
      activeUserId = state.user.id;
      localStorage.setItem("vaultUserId", activeUserId);
      showDashboard();
      render();
      toast("Your Vault account is ready.", "success");
    } catch (error) {
      $("#authMessage").textContent = error.message;
    }
  });

  $$(".app-nav button").forEach(btn => btn.addEventListener("click", () => setActiveTab(btn.dataset.tab)));
  $("#refreshBtn").addEventListener("click", () => loadState().then(() => toast("Data refreshed.")));
  $("#logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("vaultUserId");
    activeUserId = null;
    state = null;
    $("#authPanel").classList.remove("hidden");
    $("#dashboard").classList.add("hidden");
  });

  $("#addTransactionBtn").addEventListener("click", () => {
    const amount = Number($("#manualAmount").value || 0);
    const title = $("#manualTitle").value || "Manual transaction";
    if (!amount) return toast("Enter an amount first.");
    postAction({ type: "add-transaction", amount, title, category: amount > 0 ? "Income" : "General" }, "Transaction added.");
    $("#manualAmount").value = "";
    $("#manualTitle").value = "";
  });

  $$("[data-save]").forEach(btn => btn.addEventListener("click", () => {
    const bucket = btn.dataset.save;
    const input = bucket === "fixed" ? $("#fixedAmount") : $("#flexAmount");
    const amount = Number(input.value || 0);
    if (!amount) return toast("Enter a savings amount.");
    postAction({ type: "transfer-savings", bucket, amount }, "Savings updated.");
  }));

  /* Metal inputs and splits are now handled by the delegated listeners added below */

  $("#freezeBtn").addEventListener("click", () => postAction({ type: "card-toggle" }, "Card status updated."));
  $("#revealPinBtn").addEventListener("click", () => {
    $("#pinValue").textContent = state.card.pin;
    toast("PIN revealed for demo.");
  });
  $("#revealCvvBtn").addEventListener("click", () => {
    $("#cvvValue").textContent = state.card.cvv;
    toast("CVV revealed for demo.");
  });

  /* ── Metals buy/sell tabs ───────────────────────────────────────────── */
  document.addEventListener("click", e => {
    const metalActionBtn = e.target.closest("[data-metal-action]");
    if (metalActionBtn) {
      $$(".bs-tabs button").forEach(b => b.classList.remove("active"));
      metalActionBtn.classList.add("active");
      _metalAction = metalActionBtn.dataset.metalAction;
      updateMetalEstimate();
    }
    const metalTypeBtn = e.target.closest("[data-metal]");
    if (metalTypeBtn?.classList.contains("metal-type-btn")) {
      $$(".metal-type-btn").forEach(b => b.classList.remove("active"));
      metalTypeBtn.classList.add("active");
      _metalType = metalTypeBtn.dataset.metal;
      updateMetalEstimate();
    }
  });

  $("#metalGrams")?.addEventListener("input", updateMetalEstimate);

  $("#metalConfirmBtn")?.addEventListener("click", async () => {
    const grams = Number($("#metalGrams")?.value || 0);
    if (!grams) return toast("Enter grams first.");
    try {
      if (_metalAction === "buy") {
        await postAction({ type: "buy-metal",  metal: _metalType, grams }, `Bought ${grams}g ${_metalType}.`);
      } else {
        await postAction({ type: "sell-metal", metal: _metalType, grams }, `Sold ${grams}g ${_metalType}.`);
      }
      flashClass($("#metalValue"), "metal-updated");
    } catch (err) { toast(err.message, 'error'); }
  });

  /* ── Split ──────────────────────────────────────────────────────────── */
  $("#newSplitBtn")?.addEventListener("click", () => {
    $("#createSplitPanel").classList.remove("hidden");
    updateSplitPreview();
  });
  $("#cancelSplitBtn")?.addEventListener("click", () =>
    $("#createSplitPanel").classList.add("hidden")
  );

  /* Split type tabs */
  document.addEventListener("click", e => {
    const stBtn = e.target.closest("[data-split-type]");
    if (stBtn) {
      $$(".split-type-tabs button").forEach(b => b.classList.remove("active"));
      stBtn.classList.add("active");
      _splitType = stBtn.dataset.splitType;
      updateSplitPreview();
    }
  });

  ["splitName","splitAmount","splitFriends"].forEach(id =>
    $("#" + id)?.addEventListener("input", updateSplitPreview)
  );

  $("#confirmSplitBtn")?.addEventListener("click", async () => {
    const name    = $("#splitName")?.value.trim();
    const total   = Number($("#splitAmount")?.value || 0);
    const friends = ($("#splitFriends")?.value || "").split(",").map(f => f.trim()).filter(Boolean);
    if (!name)         return toast("Enter a split name.");
    if (!total)        return toast("Enter a total amount.");
    if (!friends.length) return toast("Add at least one friend.");

    let share = total;
    if (_splitType === 'equal') share = total / (friends.length + 1);
    else if (_splitType === 'percentage') {
      const myInput = document.querySelector('.pct-share[data-person="You"]');
      const pct = Number(myInput?.value || (100 / (friends.length + 1)));
      share = total * pct / 100;
    } else if (_splitType === 'custom') {
      const myInput = document.querySelector('.custom-share[data-person="You"]');
      share = Number(myInput?.value || 0);
    }

    try {
      await postAction({ type: "create-split", name, totalAmount: total, friends: friends.join(","), splitType: _splitType, share, paidByMe: true }, `Split "${name}" created.`);
      $("#createSplitPanel").classList.add("hidden");
      ["splitName","splitAmount","splitFriends"].forEach(id => { const el = $("#" + id); if (el) el.value = ""; });
    } catch (err) { toast(err.message, 'error'); }
  });

  /* Filter tabs */
  document.addEventListener("click", e => {
    const filterBtn = e.target.closest("[data-split-filter]");
    if (filterBtn) {
      $$(".filter-tabs button").forEach(b => b.classList.remove("active"));
      filterBtn.classList.add("active");
      _splitFilter = filterBtn.dataset.splitFilter;
      if (state) renderSplits();
    }
  });

  /* Settle / Remind - event delegation on list */
  $("#splits")?.addEventListener("click", e => {
    const settle = e.target.dataset.settle;
    const remind = e.target.dataset.remind;
    if (settle) postAction({ type: "split-settle", splitId: settle }, "Split settled!");
    if (remind) postAction({ type: "split-remind", splitId: remind }, "Reminder sent.");
  });

  /* ── Transfer ───────────────────────────────────────────────────────── */
  document.addEventListener("click", e => {
    const tmBtn = e.target.closest("[data-transfer-method]");
    if (tmBtn) {
      $$(".transfer-method-tabs button").forEach(b => b.classList.remove("active"));
      tmBtn.classList.add("active");
      _transferMethod = tmBtn.dataset.transferMethod;
      $$(".transfer-panel").forEach(p => p.classList.add("hidden"));
      const panelMap = { bsb: "transferPanelBsb", payid: "transferPanelPayid", saved: "transferPanelSaved" };
      $("#" + (panelMap[_transferMethod] || "transferPanelBsb"))?.classList.remove("hidden");
      if (_transferMethod === "saved") renderTransfer();
    }
    /* Use saved recipient */
    const useIdx = e.target.dataset.useRecipient;
    if (useIdx !== undefined) {
      const r = _mergedRecipients[+useIdx];
      if (!r) return;
      const bsbBtn = document.querySelector('[data-transfer-method="bsb"]');
      const payidBtn = document.querySelector('[data-transfer-method="payid"]');
      if (r.bsb && bsbBtn) {
        bsbBtn.click();
        if ($("#tBsb")) $("#tBsb").value = r.bsb;
        if ($("#tAccount")) $("#tAccount").value = r.account;
        if ($("#tName")) $("#tName").value = r.name;
      } else if (r.payid && payidBtn) {
        payidBtn.click();
        if ($("#tPayidValue")) $("#tPayidValue").value = r.payid;
        if ($("#tName")) $("#tName").value = r.name;
      }
    }
  });

  $("#tReviewBsbBtn")?.addEventListener("click", () => {
    const bsb    = $("#tBsb")?.value.trim();
    const account = $("#tAccount")?.value.trim();
    const name   = $("#tName")?.value.trim();
    const amount = Number($("#tAmount")?.value || 0);
    const ref    = $("#tRef")?.value.trim();
    const save   = $("#tSave")?.checked;
    if (!bsb || !account) return toast("Enter BSB and account number.");
    if (!name)   return toast("Enter account holder name.");
    if (!amount || amount <= 0) return toast("Enter a valid amount.");
    if (state && amount > state.user.balance) return toast(`Insufficient balance. Available: ${money(state.user.balance)}.`);
    showTransferReview({ type: "bsb", bsb, account, recipientName: name, amount, reference: ref, save });
  });

  $("#tReviewPayidBtn")?.addEventListener("click", () => {
    const payidType  = $("#tPayidType")?.value;
    const payidValue = $("#tPayidValue")?.value.trim();
    const amount     = Number($("#tPayidAmount")?.value || 0);
    const ref        = $("#tPayidRef")?.value.trim();
    const save       = $("#tSavePayid")?.checked;
    if (!payidValue) return toast("Enter a PayID.");
    if (!amount || amount <= 0) return toast("Enter a valid amount.");
    if (state && amount > state.user.balance) return toast(`Insufficient balance. Available: ${money(state.user.balance)}.`);
    showTransferReview({ type: "payid", payid: payidValue, payidType, recipientName: payidValue, amount, reference: ref, save });
  });

  /* PIN pad */
  $("#pinPad")?.addEventListener("click", e => {
    const key = e.target.dataset.key;
    if (!key) return;
    if (key === "⌫") { _enteredPin = _enteredPin.slice(0, -1); }
    else if (_enteredPin.length < 4) { _enteredPin += key; }
    updatePinDots();
    $("#pinError")?.classList.add("hidden");
  });

  $("#cancelReviewBtn")?.addEventListener("click", () => {
    $("#transferReviewOverlay")?.classList.add("hidden");
    _enteredPin = "";
  });

  $("#confirmTransferBtn")?.addEventListener("click", confirmTransfer);

  $("#receiptDoneBtn")?.addEventListener("click", () => {
    $("#transferReceiptOverlay")?.classList.add("hidden");
    ["tBsb","tAccount","tName","tAmount","tRef"].forEach(id => { const el = $("#" + id); if (el) el.value = ""; });
    renderTransfer();
  });

  /* ── Savings: withdraw - delegated because buttons are static HTML ──── */
  document.addEventListener("click", e => {
    const bucket = e.target.dataset?.withdraw;
    if (!bucket) return;
    const input  = bucket === "fixed" ? $("#fixedAmount") : $("#flexAmount");
    const amount = Number(input?.value || 0);
    if (!amount) return toast("Enter a withdrawal amount.");
    postAction({ type: "withdraw-savings", bucket, amount }, `Withdrawn ${money(amount)} from ${bucket} savings.`);
  });

  /* ── Goals ──────────────────────────────────────────────────────────── */
  $("#newGoalBtn")?.addEventListener("click", () => {
    $("#createGoalPanel")?.classList.remove("hidden");
  });
  $("#cancelGoalBtn")?.addEventListener("click", () => {
    $("#createGoalPanel")?.classList.add("hidden");
    ["goalName","goalTarget"].forEach(id => { const el = $("#" + id); if (el) el.value = ""; });
  });
  $("#confirmGoalBtn")?.addEventListener("click", async () => {
    const name   = $("#goalName")?.value.trim();
    const target = Number($("#goalTarget")?.value || 0);
    if (!name)       return toast("Enter a goal name.");
    if (target <= 0) return toast("Enter a target amount.");
    try {
      await postAction({ type: "add-goal", name, target }, `Goal "${name}" created.`);
      $("#createGoalPanel")?.classList.add("hidden");
      ["goalName","goalTarget"].forEach(id => { const el = $("#" + id); if (el) el.value = ""; });
    } catch (err) { toast(err.message, 'error'); }
  });

  /* Goal contribute/edit/delete - delegated on #goals */
  $("#goals")?.addEventListener("click", e => {
    const contributeId = e.target.dataset.goalContribute;
    const editId       = e.target.dataset.goalEdit;
    const deleteId     = e.target.dataset.goalDelete;

    if (contributeId) {
      const amount = Number(prompt("Amount to add to goal ($):"));
      if (!amount || amount <= 0) return;
      postAction({ type: "contribute-goal", goalId: contributeId, amount }, `Added ${money(amount)} to your goal.`);
    }
    if (editId) {
      const newName   = prompt("New goal name:", e.target.dataset.goalName) || "";
      const newTarget = Number(prompt("New target ($):", e.target.dataset.goalTarget) || 0);
      if (!newName || newTarget <= 0) return;
      postAction({ type: "edit-goal", goalId: editId, name: newName, target: newTarget }, "Goal updated.");
    }
    if (deleteId) {
      if (!confirm("Delete this goal? Any saved amount will be returned to your balance.")) return;
      postAction({ type: "delete-goal", goalId: deleteId }, "Goal deleted.");
    }
  });

  /* ── Budget: add / edit / delete ────────────────────────────────────── */
  $("#newBudgetBtn")?.addEventListener("click", () => {
    $("#createBudgetPanel")?.classList.remove("hidden");
  });
  $("#cancelBudgetBtn")?.addEventListener("click", () => {
    $("#createBudgetPanel")?.classList.add("hidden");
    ["budgetName","budgetLimit"].forEach(id => { const el = $("#" + id); if (el) el.value = ""; });
  });
  $("#confirmBudgetBtn")?.addEventListener("click", async () => {
    const name  = $("#budgetName")?.value.trim();
    const limit = Number($("#budgetLimit")?.value || 0);
    if (!name)       return toast("Enter a category name.");
    if (limit <= 0)  return toast("Enter a valid limit.");
    try {
      await postAction({ type: "add-budget", name, limit }, `Budget "${name}" added.`);
      $("#createBudgetPanel")?.classList.add("hidden");
      ["budgetName","budgetLimit"].forEach(id => { const el = $("#" + id); if (el) el.value = ""; });
    } catch (err) { toast(err.message, 'error'); }
  });

  $("#budgets")?.addEventListener("click", e => {
    const editId   = e.target.dataset.budgetEdit;
    const deleteId = e.target.dataset.budgetDelete;
    if (editId) {
      const newName  = prompt("New category name:", e.target.dataset.budgetName) || "";
      const newLimit = Number(prompt("New monthly limit ($):", e.target.dataset.budgetLimit) || 0);
      if (!newName || newLimit <= 0) return;
      postAction({ type: "edit-budget", budgetId: editId, name: newName, limit: newLimit }, "Budget updated.");
    }
    if (deleteId) {
      if (!confirm("Delete this budget category?")) return;
      postAction({ type: "delete-budget", budgetId: deleteId }, "Budget deleted.");
    }
  });

  /* ── Transaction filter tabs ────────────────────────────────────────── */
  document.addEventListener("click", e => {
    const txBtn = e.target.closest("[data-tx-filter]");
    if (txBtn) {
      $$("#txFilterTabs button").forEach(b => b.classList.remove("active"));
      txBtn.classList.add("active");
      _txFilter = txBtn.dataset.txFilter;
      if (state) renderTxList();
    }
  });

  /* ── Transaction search ─────────────────────────────────────────────── */
  $("#txSearch")?.addEventListener("input", e => {
    _txSearch = e.target.value;
    if (state) renderTxList();
  });

  /* ── Card: edit limit / change PIN ──────────────────────────────────── */
  $("#saveLimitBtn")?.addEventListener("click", () => {
    const limit = Number($("#newDailyLimit")?.value || 0);
    if (limit <= 0 || limit > 50000) return toast("Enter a limit between $1 and $50,000.");
    postAction({ type: "edit-card-limit", limit }, `Daily limit set to ${money(limit)}.`);
    const el = $("#newDailyLimit"); if (el) el.value = "";
  });

  $("#changePinBtn")?.addEventListener("click", async () => {
    const currentPin = $("#currentPinInput")?.value;
    const newPin     = $("#newPinInput")?.value;
    if (!currentPin || !newPin) return toast("Enter current and new PIN.");
    if (!/^\d{4}$/.test(newPin)) return toast("New PIN must be exactly 4 digits.");
    try {
      await postAction({ type: "change-pin", currentPin, newPin }, "PIN changed successfully.");
      ["currentPinInput","newPinInput"].forEach(id => { const el = $("#" + id); if (el) el.value = ""; });
    } catch (err) { toast(err.message, 'error'); }
  });

  /* Timed PIN/CVV hide - override existing reveal button listeners */
  $("#revealPinBtn")?.removeEventListener("click", null);
  $("#revealCvvBtn")?.removeEventListener("click", null);
  document.addEventListener("click", e => {
    if (e.target.id === "revealPinBtn") {
      if (!state) return;
      const el = $("#pinValue");
      if (!el) return;
      el.textContent = state.card.pin;
      toast("PIN revealed - hides in 10 s.");
      clearTimeout(_pinRevealTimer);
      _pinRevealTimer = setTimeout(() => { el.textContent = "****"; }, 10000);
    }
    if (e.target.id === "revealCvvBtn") {
      if (!state) return;
      const el = $("#cvvValue");
      if (!el) return;
      el.textContent = state.card.cvv;
      toast("CVV revealed - hides in 10 s.");
      clearTimeout(_cvvRevealTimer);
      _cvvRevealTimer = setTimeout(() => { el.textContent = "***"; }, 10000);
    }
  });

  /* ── Profile: save ──────────────────────────────────────────────────── */
  $("#saveProfileBtn")?.addEventListener("click", async () => {
    const name  = $("#profileName")?.value.trim();
    const email = $("#profileEmail")?.value.trim();
    if (!name && !email) return toast("Enter a name or email to update.");
    try {
      await postAction({ type: "edit-profile", ...(name ? { name } : {}), ...(email ? { email } : {}) }, "Profile updated.");
      const note = $("#profileNote");
      if (note) note.textContent = "Changes saved.";
      ["profileName","profileEmail"].forEach(id => { const el = $("#" + id); if (el) el.value = ""; });
    } catch (err) { toast(err.message, 'error'); }
  });

  /* ── Transfer: delete saved recipient ───────────────────────────────── */
  document.addEventListener("click", e => {
    const recipientName = e.target.dataset.deleteRecipient;
    if (recipientName !== undefined) {
      if (!confirm(`Remove "${recipientName}" from saved recipients?`)) return;
      /* Remove from localStorage */
      const saved = JSON.parse(localStorage.getItem("vaultRecipients") || "[]");
      localStorage.setItem("vaultRecipients", JSON.stringify(saved.filter(r => r.name !== recipientName)));
      /* Remove from DB */
      postAction({ type: "delete-recipient", recipientName }, null)
        .catch(() => {})
        .finally(() => renderTransfer());
    }
  });

  /* ── Invest: asset selector tabs ────────────────────────────────────── */
  document.addEventListener("click", e => {
    const assetBtn = e.target.closest("[data-invest-asset]");
    if (assetBtn && assetBtn.closest("#assetSelector")) {
      document.querySelectorAll("#assetSelector button").forEach(b => b.classList.remove("active"));
      assetBtn.classList.add("active");
      _investAsset = assetBtn.dataset.investAsset;
      renderAssetDetail();
      renderInvestChart();
    }
  });

  /* ── Invest: chart type selector ────────────────────────────────────── */
  document.addEventListener("click", e => {
    const ctBtn = e.target.closest("[data-chart-type]");
    if (ctBtn) {
      document.querySelectorAll("#chartTypeSelector button").forEach(b => b.classList.remove("active"));
      ctBtn.classList.add("active");
      _investChartType = ctBtn.dataset.chartType;
      renderInvestChart();
    }
  });

  /* ── Invest: time range tabs ────────────────────────────────────────── */
  document.addEventListener("click", e => {
    const rangeBtn = e.target.closest("[data-range]");
    if (rangeBtn) {
      document.querySelectorAll("#timeRangeTabs button").forEach(b => b.classList.remove("active"));
      rangeBtn.classList.add("active");
      _investTimeRange = rangeBtn.dataset.range;
      renderInvestChart();
    }
  });

  /* ── Invest: refresh prices button ─────────────────────────────────── */
  document.getElementById("refreshPricesBtn")?.addEventListener("click", async () => {
    try {
      await postAction({ type: "refresh-market-prices" }, null);
      _liveMarketPrices = JSON.parse(JSON.stringify(state.marketPrices || {}));
      renderInvest();
      toast("Prices refreshed.");
    } catch (err) { toast(err.message, 'error'); }
  });

  /* ── Invest: buy / sell / watchlist buttons (delegated) ─────────────── */
  document.addEventListener("click", e => {
    const buyBtn = e.target.closest("[data-invest-buy]");
    const sellBtn = e.target.closest("[data-invest-sell]");
    const wlBtn   = e.target.closest("[data-invest-watchlist]");

    if (buyBtn) {
      const sym  = buyBtn.dataset.investBuy;
      const name = buyBtn.dataset.investName;
      _investTradePending = { symbol: sym, name, mode: "buy" };
      const price = livePrice(sym);
      const tradeTitle = document.getElementById("investTradeTitle");
      const tradePrice = document.getElementById("investTradePrice");
      if (tradeTitle) tradeTitle.textContent = `Buy ${name} (${sym})`;
      if (tradePrice) tradePrice.textContent = `Current price: ${money(price)}`;
      document.getElementById("investBuySection")?.classList.remove("hidden");
      document.getElementById("investSellSection")?.classList.add("hidden");
      const amt = document.getElementById("investTradeAmt");
      if (amt) { amt.value = ""; }
      document.getElementById("investTradeEstimate").textContent = "";
      document.getElementById("investTradeOverlay")?.classList.remove("hidden");
    }

    if (sellBtn) {
      const sym  = sellBtn.dataset.investSell;
      const name = sellBtn.dataset.investName;
      const inv  = state?.investments?.crypto || [];
      const holding = inv.find(c => c.symbol === sym);
      if (!holding || holding.quantity < 0.000001) return toast("No holdings to sell.");
      _investTradePending = { symbol: sym, name, mode: "sell" };
      const price = livePrice(sym);
      const tradeTitle = document.getElementById("investTradeTitle");
      const tradePrice = document.getElementById("investTradePrice");
      if (tradeTitle) tradeTitle.textContent = `Sell ${name} (${sym})`;
      if (tradePrice) tradePrice.textContent = `Current price: ${money(price)} · You hold: ${holding.quantity.toFixed(6)} ${sym}`;
      document.getElementById("investBuySection")?.classList.add("hidden");
      document.getElementById("investSellSection")?.classList.remove("hidden");
      const qty = document.getElementById("investSellQty");
      if (qty) { qty.value = ""; qty.max = holding.quantity; }
      document.getElementById("investSellEstimate").textContent = "";
      document.getElementById("investTradeOverlay")?.classList.remove("hidden");
    }

    if (wlBtn) {
      const sym  = wlBtn.dataset.investWatchlist;
      const name = wlBtn.dataset.investName;
      const isActive = wlBtn.dataset.investWlActive === "true";
      if (isActive) {
        postAction({ type: "remove-watchlist", symbol: sym }, `${sym} removed from watchlist.`);
      } else {
        postAction({ type: "add-watchlist", symbol: sym, name }, `${sym} added to watchlist.`);
      }
    }
  });

  /* Buy amount estimate */
  document.getElementById("investTradeAmt")?.addEventListener("input", () => {
    const aud  = Number(document.getElementById("investTradeAmt").value || 0);
    const sym  = _investTradePending?.symbol;
    const price = sym ? livePrice(sym) : 0;
    const est  = document.getElementById("investTradeEstimate");
    if (est) est.textContent = aud > 0 && price > 0 ? `You receive approx. ${(aud / price).toFixed(6)} ${sym}` : "";
  });

  /* Sell quantity estimate */
  document.getElementById("investSellQty")?.addEventListener("input", () => {
    const qty   = Number(document.getElementById("investSellQty").value || 0);
    const sym   = _investTradePending?.symbol;
    const price  = sym ? livePrice(sym) : 0;
    const est   = document.getElementById("investSellEstimate");
    if (est) est.textContent = qty > 0 && price > 0 ? `You receive approx. ${money(qty * price)}` : "";
  });

  /* Trade cancel */
  document.getElementById("investTradeCancelBtn")?.addEventListener("click", () => {
    document.getElementById("investTradeOverlay")?.classList.add("hidden");
    _investTradePending = null;
  });

  /* Trade confirm */
  document.getElementById("investTradeConfirmBtn")?.addEventListener("click", async () => {
    if (!_investTradePending) return;
    const { symbol, name, mode } = _investTradePending;
    try {
      if (mode === "buy") {
        const aud = Number(document.getElementById("investTradeAmt")?.value || 0);
        if (!aud || aud <= 0) return toast("Enter an amount to buy.");
        await postAction({ type: "buy-investment", symbol, name, audAmount: aud }, `Bought ${money(aud)} of ${name}.`);
      } else {
        const qty = Number(document.getElementById("investSellQty")?.value || 0);
        if (!qty || qty <= 0) return toast("Enter a quantity to sell.");
        await postAction({ type: "sell-investment", symbol, quantity: qty }, `Sold ${qty.toFixed(6)} ${symbol}.`);
      }
      document.getElementById("investTradeOverlay")?.classList.add("hidden");
      _liveMarketPrices = JSON.parse(JSON.stringify(state.marketPrices || {}));
      _investTradePending = null;
    } catch (err) { toast(err.message, 'error'); }
  });

  /* Start live ticker when Invest tab becomes active */
  document.querySelectorAll(".app-nav button").forEach(btn => {
    if (btn.dataset.tab === "invest") {
      btn.addEventListener("click", () => {
        startLivePriceTick();
        if (state) renderInvest();
      });
    }
  });

  /* ── Transaction detail overlay ─────────────────────────────────────── */
  $("#txList")?.addEventListener("click", e => {
    const row = e.target.closest("[data-tx-id]");
    if (row) showTxDetail(row.dataset.txId);
  });
  $("#txDetailCloseBtn")?.addEventListener("click", () => {
    $("#txDetailOverlay")?.classList.add("hidden");
    _activeTxId = null;
  });
  $("#txDetailSaveBtn")?.addEventListener("click", async () => {
    if (!_activeTxId) return;
    const note     = $("#txDetailNote")?.value ?? "";
    const category = $("#txDetailCategory")?.value.trim();
    try {
      await postAction({ type: "edit-transaction", txId: _activeTxId, note, category }, "Transaction updated.");
      /* Refresh detail view with updated data */
      showTxDetail(_activeTxId);
    } catch (err) { toast(err.message, 'error'); }
  });
  $("#txDetailDisputeBtn")?.addEventListener("click", async () => {
    if (!_activeTxId) return;
    try {
      await postAction({ type: "dispute-transaction", txId: _activeTxId }, null);
      const tx = state?.transactions.find(t => t.id === _activeTxId);
      toast(tx?.status === 'disputed' ? "Transaction flagged as disputed." : "Dispute flag removed.");
      showTxDetail(_activeTxId);
    } catch (err) { toast(err.message, 'error'); }
  });

  /* ── Card replacement ───────────────────────────────────────────────── */
  $("#requestReplacementBtn")?.addEventListener("click", async () => {
    const card = state?.card;
    if (card?.replacementRequested) return toast("Replacement already requested.");
    if (!confirm("Request a replacement card? A new card will be issued within 5 business days.")) return;
    try {
      await postAction({ type: "request-card-replacement" }, "Replacement card requested. Arrives in 5 business days.");
      $("#requestReplacementBtn").textContent = "Replacement requested ✓";
      $("#requestReplacementBtn").disabled = true;
    } catch (err) { toast(err.message, 'error'); }
  });

  /* ── Notification preferences save ─────────────────────────────────── */
  $("#saveNotificationsBtn")?.addEventListener("click", async () => {
    const keys = ["transfers", "budgetAlerts", "savingsUpdates", "securityAlerts"];
    const payload = { type: "edit-notifications" };
    keys.forEach(k => { payload[k] = !!($("#notif-" + k)?.checked); });
    try {
      await postAction(payload, "Notification preferences saved.");
      const note = $("#notifNote");
      if (note) note.textContent = "Preferences saved.";
    } catch (err) { toast(err.message, 'error'); }
  });

  /* ── Static warning dismiss ─────────────────────────────────────────── */
  $("#staticWarningClose")?.addEventListener("click", () => {
    $("#staticWarning")?.classList.add("hidden");
  });
}

bindEvents();
if (USE_FIREBASE) $('#staticWarning')?.classList.remove('hidden');
if (location.hash) {
  const tab = location.hash.replace("#", "");
  if ($(`#tab-${tab}`)) setActiveTab(tab);
}
loadState().catch(() => localStorage.removeItem("vaultUserId"));
