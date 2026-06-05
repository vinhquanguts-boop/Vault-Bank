const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const DB_PATH = path.join(ROOT, "data", "vault-db.json");
const START_PORT = Number(process.env.PORT || 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".otf": "font/otf",
  ".woff2": "font/woff2"
};

function readDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function genId(prefix) {
  return `${prefix}_${crypto.randomBytes(5).toString("hex")}`;
}

function genTxId() {
  return "VLT" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function json(res, status, data) {
  send(res, status, JSON.stringify(data), "application/json; charset=utf-8");
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function safeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

function money(value) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(Number(value || 0));
}

function userState(db, userId) {
  const user = db.users.find(item => item.id === userId);
  if (!user) return null;
  return {
    user: safeUser(user),
    budgets: db.budgets[userId] || [],
    savings: db.savings[userId] || { flexible: 0, fixed: 0, goals: [] },
    metals: db.metals[userId] || { gold: 0, silver: 0 },
    splits: db.splits[userId] || [],
    transactions: db.transactions[userId] || [],
    card: db.cards[userId],
    settings: db.settings,
    recipients: (db.recipients || {})[userId] || [],
    investments: (db.investments || {})[userId] || { crypto: [], history: [] },
    marketPrices: db.marketPrices || {}
  };
}

function logAction(db, action, detail) {
  db.actions.unshift({
    id: genId("a"),
    action,
    detail,
    at: new Date().toISOString()
  });
  db.actions = db.actions.slice(0, 200);
}

function addTransaction(db, userId, title, category, amount, type = amount >= 0 ? "income" : "expense", extra = {}) {
  db.transactions[userId] ||= [];
  db.transactions[userId].unshift({
    id: genId("t"),
    title,
    category,
    amount: Number(amount),
    type,
    date: "Just now",
    ...extra
  });
}

function updateSpendTotals(db, userId) {
  const tx = db.transactions[userId] || [];
  const user = db.users.find(item => item.id === userId);
  if (!user) return;
  user.spent = tx
    .filter(item => item.amount < 0 && item.category !== "Savings" && item.category !== "Metals" && item.category !== "Transfer")
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const savings = db.savings[userId] || { flexible: 0, fixed: 0 };
  const goals = savings.goals || [];
  const goalTotal = goals.reduce((s, g) => s + (g.current || 0), 0);
  user.saved = Number((savings.flexible * 0.065 / 12 + savings.fixed * 0.085 / 12 + goalTotal * 0.02 / 12).toFixed(2));
}

async function api(req, res) {
  const db = readDb();
  const url = new URL(req.url, `http://${req.headers.host}`);

  /* ── GET /api/db ─────────────────────────────────────────────────────── */
  if (req.method === "GET" && url.pathname === "/api/db") {
    return json(res, 200, db);
  }

  /* ── GET /api/state/:userId ──────────────────────────────────────────── */
  if (req.method === "GET" && url.pathname.startsWith("/api/state/")) {
    const state = userState(db, decodeURIComponent(url.pathname.split("/").pop()));
    return state ? json(res, 200, state) : json(res, 404, { error: "User not found" });
  }

  /* ── POST /api/login ─────────────────────────────────────────────────── */
  if (req.method === "POST" && url.pathname === "/api/login") {
    const { email, password } = await parseBody(req);
    const user = db.users.find(
      item => item.email.toLowerCase() === String(email || "").toLowerCase() && item.password === password
    );
    if (!user) return json(res, 401, { error: "Email or password is incorrect" });
    logAction(db, "login", `${user.email} signed in`);
    writeDb(db);
    return json(res, 200, userState(db, user.id));
  }

  /* ── POST /api/signup ────────────────────────────────────────────────── */
  if (req.method === "POST" && url.pathname === "/api/signup") {
    const body = await parseBody(req);
    const email = String(body.email || "").toLowerCase();
    if (!email || !body.password || !body.name)
      return json(res, 400, { error: "Name, email and password are required" });
    if (db.users.some(user => user.email.toLowerCase() === email))
      return json(res, 409, { error: "This email already exists" });
    const userId = genId("u");
    const firstName = String(body.name).trim().split(/\s+/)[0] || "Vault";
    const user = {
      id: userId,
      name: String(body.name).trim(),
      email,
      password: String(body.password),
      avatar: firstName.charAt(0).toUpperCase(),
      balance: 1250,
      monthlyIncome: 0,
      spent: 0,
      saved: 0,
      trustScore: 72,
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    db.budgets[userId] = [
      { id: genId("b"), name: "Groceries", spent: 0, limit: 400, icon: "basket" },
      { id: genId("b"), name: "Dining",    spent: 0, limit: 250, icon: "fork"   },
      { id: genId("b"), name: "Transport", spent: 0, limit: 180, icon: "train"  }
    ];
    db.savings[userId] = {
      flexible: 0, fixed: 0,
      goals: [{ id: genId("g"), name: "Emergency fund", current: 0, target: 3000, createdAt: new Date().toISOString() }]
    };
    db.metals[userId] = { gold: 0, silver: 0 };
    db.splits[userId] = [];
    db.transactions[userId] = [];
    db.cards[userId] = {
      holder: user.name,
      last4: String(Math.floor(1000 + Math.random() * 8999)),
      pin: "1234",
      cvv: String(Math.floor(100 + Math.random() * 899)),
      dailyLimit: 2000,
      frozen: false,
      status: "Active"
    };
    db.recipients ||= {};
    db.recipients[userId] = [];
    db.transferReceipts ||= {};
    db.transferReceipts[userId] = [];
    db.investments ||= {};
    db.investments[userId] = { crypto: [], history: [] };
    logAction(db, "signup", `${email} created an account`);
    writeDb(db);
    return json(res, 200, userState(db, userId));
  }

  /* ── POST /api/action ────────────────────────────────────────────────── */
  if (req.method === "POST" && url.pathname === "/api/action") {
    const body = await parseBody(req);
    const user = db.users.find(item => item.id === body.userId);
    if (!user) return json(res, 404, { error: "User not found" });

    /* Ensure sub-collections exist */
    db.recipients ||= {};
    db.recipients[user.id] ||= [];
    db.transferReceipts ||= {};
    db.transferReceipts[user.id] ||= [];
    db.savings[user.id] ||= { flexible: 0, fixed: 0, goals: [] };
    db.savings[user.id].goals ||= [];
    db.metals[user.id] ||= { gold: 0, silver: 0 };
    db.budgets[user.id] ||= [];
    db.investments ||= {};
    db.investments[user.id] ||= { crypto: [], history: [] };
    db.investments[user.id].crypto ||= [];
    db.investments[user.id].history ||= [];
    db.marketPrices ||= { gold: { aud: 3318.2 }, silver: { aud: 38.4 }, BTC: { aud: 158000 }, ETH: { aud: 5600 } };

    /* ── Savings: deposit ─────────────────────────────────────────────── */
    if (body.type === "transfer-savings") {
      const bucket = body.bucket === "fixed" ? "fixed" : "flexible";
      const amount = Number(body.amount || 0);
      if (amount <= 0) return json(res, 400, { error: "Enter a valid amount." });
      if (amount > user.balance) return json(res, 400, { error: `Insufficient balance. You have ${money(user.balance)}.` });
      db.savings[user.id][bucket] += amount;
      user.balance -= amount;
      addTransaction(db, user.id, `${bucket === "fixed" ? "Fixed" : "Flexible"} savings deposit`, "Savings", -amount, "transfer");
      logAction(db, "savings", `${user.email} deposited ${money(amount)} into ${bucket}`);
    }

    /* ── Savings: withdraw ────────────────────────────────────────────── */
    if (body.type === "withdraw-savings") {
      const bucket = body.bucket === "fixed" ? "fixed" : "flexible";
      const amount = Number(body.amount || 0);
      const available = db.savings[user.id][bucket] || 0;
      if (amount <= 0) return json(res, 400, { error: "Enter a valid amount." });
      if (amount > available) return json(res, 400, { error: `Only ${money(available)} available in ${bucket} savings.` });
      db.savings[user.id][bucket] -= amount;
      user.balance += amount;
      addTransaction(db, user.id, `${bucket === "fixed" ? "Fixed" : "Flexible"} savings withdrawal`, "Savings", amount, "income");
      logAction(db, "savings", `${user.email} withdrew ${money(amount)} from ${bucket}`);
    }

    /* ── Goals ────────────────────────────────────────────────────────── */
    if (body.type === "add-goal") {
      const name = String(body.name || "").trim();
      const target = Number(body.target || 0);
      if (!name) return json(res, 400, { error: "Enter a goal name." });
      if (target <= 0) return json(res, 400, { error: "Enter a valid target amount." });
      db.savings[user.id].goals.push({
        id: genId("g"),
        name,
        current: 0,
        target,
        createdAt: new Date().toISOString()
      });
      logAction(db, "savings", `${user.email} added goal "${name}"`);
    }

    if (body.type === "edit-goal") {
      const goal = db.savings[user.id].goals.find(g => g.id === body.goalId);
      if (!goal) return json(res, 404, { error: "Goal not found." });
      if (body.name) goal.name = String(body.name).trim();
      if (body.target) goal.target = Number(body.target);
      logAction(db, "savings", `${user.email} edited goal "${goal.name}"`);
    }

    if (body.type === "delete-goal") {
      const goals = db.savings[user.id].goals;
      const idx = goals.findIndex(g => g.id === body.goalId);
      if (idx !== -1) {
        const refunded = goals[idx].current || 0;
        goals.splice(idx, 1);
        if (refunded > 0) {
          user.balance += refunded;
          addTransaction(db, user.id, "Goal deleted - funds returned", "Savings", refunded, "income");
        }
        logAction(db, "savings", `${user.email} deleted a savings goal`);
      }
    }

    if (body.type === "contribute-goal") {
      const goal = db.savings[user.id].goals.find(g => g.id === body.goalId);
      const amount = Number(body.amount || 0);
      if (!goal) return json(res, 404, { error: "Goal not found." });
      if (amount <= 0) return json(res, 400, { error: "Enter a valid amount." });
      if (amount > user.balance) return json(res, 400, { error: `Insufficient balance. You have ${money(user.balance)}.` });
      goal.current += amount;
      user.balance -= amount;
      addTransaction(db, user.id, `Saved toward "${goal.name}"`, "Savings", -amount, "transfer");
      logAction(db, "savings", `${user.email} contributed ${money(amount)} to "${goal.name}"`);
    }

    /* ── Metals: buy ──────────────────────────────────────────────────── */
    if (body.type === "buy-metal") {
      const metal = body.metal === "silver" ? "silver" : "gold";
      const grams = Number(body.grams || 0);
      if (grams <= 0) return json(res, 400, { error: "Enter a valid gram amount." });
      const spotAud = metal === "gold" ? db.settings.goldAud : db.settings.silverAud;
      const spotPerGram = spotAud / 31.1035;
      const buySpreadPct = db.settings.metalBuySpreadPct || 0.75;
      const buySpread = spotPerGram * (buySpreadPct / 100);
      const cost = Number(((spotPerGram + buySpread) * grams + db.settings.metalFee).toFixed(2));
      if (cost > user.balance) return json(res, 400, { error: `Insufficient balance. Cost is ${money(cost)}, you have ${money(user.balance)}.` });
      db.metals[user.id][metal] += grams;
      user.balance -= cost;
      addTransaction(db, user.id, `Bought ${grams}g ${metal}`, "Metals", -cost, "expense");
      logAction(db, "metals", `${user.email} bought ${grams}g ${metal} for ${money(cost)}`);
    }

    /* ── Metals: sell ─────────────────────────────────────────────────── */
    if (body.type === "sell-metal") {
      const metal = body.metal === "silver" ? "silver" : "gold";
      const grams = Number(body.grams || 0);
      if (grams <= 0) return json(res, 400, { error: "Enter a valid gram amount." });
      const holdings = db.metals[user.id][metal] || 0;
      if (grams > holdings) return json(res, 400, { error: `You only hold ${holdings.toFixed(2)}g ${metal}.` });
      const spotAud = metal === "gold" ? db.settings.goldAud : db.settings.silverAud;
      const spotPerGram = spotAud / 31.1035;
      const sellSpreadPct = db.settings.metalSellSpreadPct || 0.50;
      const sellSpread = spotPerGram * (sellSpreadPct / 100);
      const proceeds = Number(((spotPerGram - sellSpread) * grams - db.settings.metalFee).toFixed(2));
      if (proceeds <= 0) return json(res, 400, { error: "Amount too small after fee deduction." });
      db.metals[user.id][metal] -= grams;
      user.balance += proceeds;
      addTransaction(db, user.id, `Sold ${grams}g ${metal}`, "Metals", proceeds, "income");
      logAction(db, "metals", `${user.email} sold ${grams}g ${metal}, received ${money(proceeds)}`);
    }

    /* ── Split: create ────────────────────────────────────────────────── */
    if (body.type === "create-split") {
      const name = String(body.name || "").trim();
      const totalAmount = Number(body.totalAmount || 0);
      const friends = String(body.friends || "").split(",").map(f => f.trim()).filter(Boolean);
      if (!name) return json(res, 400, { error: "Split name is required." });
      if (totalAmount <= 0) return json(res, 400, { error: "Enter a valid total amount." });
      if (!friends.length) return json(res, 400, { error: "Add at least one friend." });
      db.splits[user.id] ||= [];
      db.splits[user.id].unshift({
        id: genId("s"),
        name,
        amount: Number(body.share || 0),
        totalAmount,
        friend: friends.join(", "),
        splitType: body.splitType || "equal",
        status: body.paidByMe ? "owed" : "owe",
        date: new Date().toISOString()
      });
      logAction(db, "split", `${user.email} created split "${name}"`);
    }

    /* ── Split: remind ────────────────────────────────────────────────── */
    if (body.type === "split-remind") {
      const split = (db.splits[user.id] || []).find(item => item.id === body.splitId);
      if (split) {
        split.reminded = true;
        split.remindedAt = new Date().toISOString();
        logAction(db, "split", `${user.email} sent reminder for "${split.name}"`);
      }
    }

    /* ── Split: settle ────────────────────────────────────────────────── */
    if (body.type === "split-settle") {
      const split = (db.splits[user.id] || []).find(item => item.id === body.splitId);
      if (split && split.status === "owe") {
        if (split.amount > user.balance) return json(res, 400, { error: `Insufficient balance to settle ${money(split.amount)}.` });
        user.balance -= split.amount;
        split.status = "settled";
        split.settledAt = new Date().toISOString();
        addTransaction(db, user.id, `Settled: ${split.name}`, "Split", -split.amount, "expense");
        logAction(db, "split", `${user.email} settled "${split.name}"`);
      }
    }

    /* ── Transfer: send ───────────────────────────────────────────────── */
    if (body.type === "transfer-send") {
      const amount = Number(body.amount || 0);
      const recipientName = String(body.recipientName || "").trim();
      if (amount <= 0) return json(res, 400, { error: "Amount must be greater than zero." });
      if (!recipientName) return json(res, 400, { error: "Recipient name is required." });
      if (amount > user.balance) return json(res, 400, { error: `Insufficient balance. You have ${money(user.balance)}.` });
      const dailyLimit = db.cards[user.id]?.dailyLimit || 5000;
      if (amount > dailyLimit) return json(res, 400, { error: `Amount exceeds your daily limit of ${money(dailyLimit)}.` });
      const txId = genTxId();
      user.balance -= amount;
      db.transferReceipts[user.id].unshift({
        id: txId,
        recipientName,
        amount,
        reference: body.reference || "",
        bsb: body.bsb || null,
        account: body.account || null,
        payid: body.payid || null,
        at: new Date().toISOString()
      });
      addTransaction(db, user.id, `Transfer to ${recipientName}`, "Transfer", -amount, "expense", { receiptId: txId });
      logAction(db, "transfer", `${user.email} sent ${money(amount)} to ${recipientName}`);
      if (body.save && recipientName) {
        const exists = db.recipients[user.id].some(r => r.name === recipientName);
        if (!exists) {
          db.recipients[user.id].unshift({
            name: recipientName,
            bsb: body.bsb || null,
            account: body.account || null,
            payid: body.payid || null
          });
          db.recipients[user.id] = db.recipients[user.id].slice(0, 10);
        }
      }
    }

    /* ── Budgets ──────────────────────────────────────────────────────── */
    if (body.type === "add-budget") {
      const name = String(body.name || "").trim();
      const limit = Number(body.limit || 0);
      if (!name) return json(res, 400, { error: "Enter a budget name." });
      if (limit <= 0) return json(res, 400, { error: "Enter a valid limit amount." });
      db.budgets[user.id].push({
        id: genId("b"),
        name,
        spent: 0,
        limit,
        icon: body.icon || "tag"
      });
      logAction(db, "budget", `${user.email} added budget "${name}"`);
    }

    if (body.type === "edit-budget") {
      const budget = db.budgets[user.id].find(b => b.id === body.budgetId);
      if (!budget) return json(res, 404, { error: "Budget not found." });
      if (body.name) budget.name = String(body.name).trim();
      if (body.limit) budget.limit = Number(body.limit);
      logAction(db, "budget", `${user.email} edited budget "${budget.name}"`);
    }

    if (body.type === "delete-budget") {
      const idx = db.budgets[user.id].findIndex(b => b.id === body.budgetId);
      if (idx !== -1) {
        const name = db.budgets[user.id][idx].name;
        db.budgets[user.id].splice(idx, 1);
        logAction(db, "budget", `${user.email} deleted budget "${name}"`);
      }
    }

    /* ── Card ─────────────────────────────────────────────────────────── */
    if (body.type === "card-toggle") {
      db.cards[user.id].frozen = !db.cards[user.id].frozen;
      db.cards[user.id].status = db.cards[user.id].frozen ? "Frozen" : "Active";
      logAction(db, "card", `${user.email} ${db.cards[user.id].frozen ? "froze" : "unfroze"} card`);
    }

    if (body.type === "edit-card-limit") {
      const limit = Number(body.limit || 0);
      if (limit <= 0 || limit > 50000) return json(res, 400, { error: "Limit must be between $1 and $50,000." });
      db.cards[user.id].dailyLimit = limit;
      logAction(db, "card", `${user.email} set daily limit to ${money(limit)}`);
    }

    if (body.type === "change-pin") {
      const currentPin = String(body.currentPin || "");
      const newPin = String(body.newPin || "");
      if (currentPin !== db.cards[user.id].pin) return json(res, 400, { error: "Current PIN is incorrect." });
      if (!/^\d{4}$/.test(newPin)) return json(res, 400, { error: "New PIN must be exactly 4 digits." });
      db.cards[user.id].pin = newPin;
      logAction(db, "card", `${user.email} changed their PIN`);
    }

    /* ── Transactions: manual add ─────────────────────────────────────── */
    if (body.type === "add-transaction") {
      const amount = Number(body.amount || 0);
      user.balance += amount;
      addTransaction(db, user.id, body.title || "Manual transaction", body.category || "General", amount);
      logAction(db, "transaction", `${user.email} added "${body.title || "transaction"}"`);
    }

    /* ── Profile: edit ────────────────────────────────────────────────── */
    if (body.type === "edit-profile") {
      if (body.name) user.name = String(body.name).trim();
      if (body.email) {
        const newEmail = String(body.email).toLowerCase().trim();
        if (db.users.some(u => u.id !== user.id && u.email.toLowerCase() === newEmail))
          return json(res, 400, { error: "That email is already in use." });
        user.email = newEmail;
      }
      logAction(db, "profile", `${user.email} updated their profile`);
    }

    /* ── Recipients: delete ───────────────────────────────────────────── */
    if (body.type === "delete-recipient") {
      const idx = db.recipients[user.id].findIndex(r => r.name === body.recipientName);
      if (idx !== -1) db.recipients[user.id].splice(idx, 1);
    }

    /* ── Investments: buy ─────────────────────────────────────────────── */
    if (body.type === "buy-investment") {
      const symbol = String(body.symbol || "").toUpperCase();
      const name   = String(body.name || symbol);
      const audAmount = Number(body.audAmount || 0);
      const currentPrice = (db.marketPrices[symbol] || {}).aud || 0;
      if (!symbol)          return json(res, 400, { error: "Asset symbol is required." });
      if (audAmount <= 0)   return json(res, 400, { error: "Enter a valid AUD amount." });
      if (!currentPrice)    return json(res, 400, { error: "Price data unavailable for that asset." });
      if (audAmount > user.balance) return json(res, 400, { error: `Insufficient balance. You have ${money(user.balance)}.` });
      const quantity = Number((audAmount / currentPrice).toFixed(8));
      const existing = db.investments[user.id].crypto.find(c => c.symbol === symbol);
      if (existing) {
        const totalQty = existing.quantity + quantity;
        existing.averageBuyPrice = ((existing.averageBuyPrice * existing.quantity) + (currentPrice * quantity)) / totalQty;
        existing.quantity = Number(totalQty.toFixed(8));
      } else {
        db.investments[user.id].crypto.push({ symbol, name, quantity, averageBuyPrice: currentPrice, watchlist: false });
      }
      db.investments[user.id].history.unshift({ id: genId("ih"), asset: symbol, type: "buy", quantity, price: currentPrice, date: new Date().toISOString().slice(0, 10) });
      user.balance = Number((user.balance - audAmount).toFixed(2));
      addTransaction(db, user.id, `Bought ${quantity.toFixed(6)} ${symbol}`, "Investment", -audAmount, "expense");
      logAction(db, "invest", `${user.email} bought ${quantity.toFixed(6)} ${symbol} for ${money(audAmount)}`);
    }

    /* ── Investments: sell ────────────────────────────────────────────── */
    if (body.type === "sell-investment") {
      const symbol = String(body.symbol || "").toUpperCase();
      const quantity = Number(body.quantity || 0);
      const currentPrice = (db.marketPrices[symbol] || {}).aud || 0;
      const existing = db.investments[user.id].crypto.find(c => c.symbol === symbol);
      if (!existing)        return json(res, 400, { error: `You do not hold any ${symbol}.` });
      if (quantity <= 0)    return json(res, 400, { error: "Enter a valid quantity." });
      if (quantity > existing.quantity) return json(res, 400, { error: `You only hold ${existing.quantity.toFixed(6)} ${symbol}.` });
      if (!currentPrice)    return json(res, 400, { error: "Price data unavailable." });
      const proceeds = Number((quantity * currentPrice).toFixed(2));
      existing.quantity = Number((existing.quantity - quantity).toFixed(8));
      if (existing.quantity < 0.000001 && !existing.watchlist) {
        db.investments[user.id].crypto = db.investments[user.id].crypto.filter(c => c.symbol !== symbol);
      }
      db.investments[user.id].history.unshift({ id: genId("ih"), asset: symbol, type: "sell", quantity, price: currentPrice, date: new Date().toISOString().slice(0, 10) });
      user.balance = Number((user.balance + proceeds).toFixed(2));
      addTransaction(db, user.id, `Sold ${quantity.toFixed(6)} ${symbol}`, "Investment", proceeds, "income");
      logAction(db, "invest", `${user.email} sold ${quantity.toFixed(6)} ${symbol} for ${money(proceeds)}`);
    }

    /* ── Investments: watchlist ───────────────────────────────────────── */
    if (body.type === "add-watchlist") {
      const symbol = String(body.symbol || "").toUpperCase();
      const name   = String(body.name || symbol);
      const currentPrice = (db.marketPrices[symbol] || {}).aud || 0;
      const existing = db.investments[user.id].crypto.find(c => c.symbol === symbol);
      if (existing) {
        existing.watchlist = true;
      } else {
        db.investments[user.id].crypto.push({ symbol, name, quantity: 0, averageBuyPrice: currentPrice, watchlist: true });
      }
      logAction(db, "invest", `${user.email} added ${symbol} to watchlist`);
    }

    if (body.type === "remove-watchlist") {
      const symbol = String(body.symbol || "").toUpperCase();
      const existing = db.investments[user.id].crypto.find(c => c.symbol === symbol);
      if (existing) {
        existing.watchlist = false;
        if (existing.quantity < 0.000001) {
          db.investments[user.id].crypto = db.investments[user.id].crypto.filter(c => c.symbol !== symbol);
        }
      }
      logAction(db, "invest", `${user.email} removed ${symbol} from watchlist`);
    }

    /* ── Market prices: refresh (simulated) ──────────────────────────── */
    if (body.type === "refresh-market-prices") {
      Object.keys(db.marketPrices).forEach(key => {
        const movement = 1 + (Math.random() - 0.5) * 0.01;
        db.marketPrices[key].aud = Number((db.marketPrices[key].aud * movement).toFixed(2));
      });
      /* Keep metals in sync with settings */
      db.settings.goldAud   = db.marketPrices.gold?.aud   || db.settings.goldAud;
      db.settings.silverAud = db.marketPrices.silver?.aud || db.settings.silverAud;
      logAction(db, "invest", `${user.email} refreshed market prices`);
    }

    updateSpendTotals(db, user.id);
    writeDb(db);
    return json(res, 200, userState(db, user.id));
  }

  /* ── POST /api/admin/update ──────────────────────────────────────────── */
  if (req.method === "POST" && url.pathname === "/api/admin/update") {
    const body = await parseBody(req);

    if (body.section === "settings") {
      if (Object.prototype.hasOwnProperty.call(db.settings, body.field)) {
        db.settings[body.field] = Number.isFinite(Number(body.value)) ? Number(body.value) : body.value;
        logAction(db, "admin", `Updated setting "${body.field}" → ${body.value}`);
      }
    }

    if (body.section === "user") {
      const user = db.users.find(item => item.id === body.userId);
      if (user && ["balance", "monthlyIncome", "spent", "saved", "trustScore", "name", "email"].includes(body.field)) {
        user[body.field] = ["balance","monthlyIncome","spent","saved","trustScore"].includes(body.field)
          ? Number(body.value) : body.value;
        logAction(db, "admin", `Updated ${user.email} ${body.field}`);
      }
    }

    if (body.section === "budget") {
      const budgets = db.budgets[body.userId] || [];
      const budget = budgets.find(b => b.id === body.budgetId);
      if (budget && ["name","limit","spent"].includes(body.field)) {
        budget[body.field] = body.field === "name" ? body.value : Number(body.value);
        logAction(db, "admin", `Updated budget "${budget.name}" ${body.field}`);
      }
    }

    if (body.section === "add-budget") {
      const userId = body.userId;
      const name = String(body.name || "").trim();
      const limit = Number(body.limit || 0);
      if (userId && name && limit > 0) {
        db.budgets[userId] ||= [];
        db.budgets[userId].push({ id: genId("b"), name, spent: 0, limit, icon: body.icon || "tag" });
        logAction(db, "admin", `Added budget "${name}" for user ${userId}`);
      }
    }

    if (body.section === "delete-budget") {
      const budgets = db.budgets[body.userId] || [];
      const idx = budgets.findIndex(b => b.id === body.budgetId);
      if (idx !== -1) { budgets.splice(idx, 1); logAction(db, "admin", "Deleted budget"); }
    }

    if (body.section === "metals") {
      const userId = body.userId;
      if (db.metals[userId] && ["gold","silver"].includes(body.field)) {
        db.metals[userId][body.field] = Number(body.value);
        logAction(db, "admin", `Updated ${userId} metals ${body.field} → ${body.value}g`);
      }
    }

    if (body.section === "card") {
      const card = db.cards[body.userId];
      if (card && ["dailyLimit","pin","frozen","status"].includes(body.field)) {
        if (body.field === "frozen") card.frozen = body.value === "true";
        else if (body.field === "dailyLimit") card.dailyLimit = Number(body.value);
        else card[body.field] = body.value;
        logAction(db, "admin", `Updated card for ${body.userId}: ${body.field}`);
      }
    }

    if (body.section === "split") {
      const splits = db.splits[body.userId] || [];
      const split = splits.find(s => s.id === body.splitId);
      if (split && ["status","amount"].includes(body.field)) {
        split[body.field] = body.field === "amount" ? Number(body.value) : body.value;
        logAction(db, "admin", `Updated split "${split.name}" ${body.field}`);
      }
    }

    if (body.section === "goal") {
      const goals = (db.savings[body.userId] || {}).goals || [];
      const goal = goals.find(g => g.id === body.goalId);
      if (goal && ["name","target","current"].includes(body.field)) {
        goal[body.field] = body.field === "name" ? body.value : Number(body.value);
        logAction(db, "admin", `Updated goal "${goal.name}" ${body.field}`);
      }
    }

    if (body.section === "reset-demo") {
      const user = db.users.find(u => u.id === "u1");
      if (user) {
        user.balance = 16032.05;
        user.monthlyIncome = 8686;
        user.spent = 4000;
        user.saved = 850;
        user.trustScore = 78;
      }
      db.metals["u1"] = { gold: 12.42, silver: 38 };
      db.savings["u1"] = {
        flexible: 2440, fixed: 5512,
        goals: [
          { id: "g1", name: "Emergency fund", current: 2440, target: 5000, createdAt: "2026-05-20T00:00:00.000Z" },
          { id: "g2", name: "Japan trip",     current: 1780, target: 4200, createdAt: "2026-05-20T00:00:00.000Z" },
          { id: "g3", name: "New laptop",     current:  620, target: 2100, createdAt: "2026-05-20T00:00:00.000Z" }
        ]
      };
      db.cards["u1"] = { holder: "Sarah Chen", last4: "8821", pin: "4821", cvv: "482", dailyLimit: 5000, frozen: false, status: "Active" };
      db.investments ||= {};
      db.investments["u1"] = {
        crypto: [
          { symbol: "BTC", name: "Bitcoin",  quantity: 0.018, averageBuyPrice: 98000, watchlist: true  },
          { symbol: "ETH", name: "Ethereum", quantity: 0.5,   averageBuyPrice: 5200,  watchlist: false }
        ],
        history: [
          { id: "ih1", asset: "BTC", type: "buy", quantity: 0.005, price: 96000, date: "2026-06-01" },
          { id: "ih2", asset: "BTC", type: "buy", quantity: 0.013, price: 98500, date: "2026-06-03" },
          { id: "ih3", asset: "ETH", type: "buy", quantity: 0.5,   price: 5200,  date: "2026-06-02" }
        ]
      };
      db.marketPrices = { gold: { aud: 3318.2 }, silver: { aud: 38.4 }, BTC: { aud: 158000 }, ETH: { aud: 5600 } };
      db.settings.goldAud   = 3318.2;
      db.settings.silverAud = 38.4;
      logAction(db, "admin", "Demo data reset to factory defaults");
    }

    writeDb(db);
    return json(res, 200, db);
  }

  return json(res, 404, { error: "API route not found" });
}

function staticFile(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let filePath = decodeURIComponent(url.pathname);
  if (filePath === "/") filePath = "/index.html";
  if (filePath === "/favicon.ico") filePath = "/assets/logo2.png";
  const fullPath = path.normalize(path.join(ROOT, filePath));
  if (!fullPath.startsWith(ROOT)) return send(res, 403, "Forbidden", "text/plain");
  fs.readFile(fullPath, (error, data) => {
    if (error) return send(res, 404, "Not found", "text/plain");
    send(res, 200, data, MIME[path.extname(fullPath)] || "application/octet-stream");
  });
}

function createServer(port) {
  const server = http.createServer((req, res) => {
    if (req.url.startsWith("/api/")) {
      api(req, res).catch(error => json(res, 500, { error: error.message }));
    } else {
      staticFile(req, res);
    }
  });
  server.on("error", error => {
    if (error.code === "EADDRINUSE" && port < START_PORT + 20) createServer(port + 1);
    else throw error;
  });
  server.listen(port, () => {
    console.log(`Vault server running at http://localhost:${port}`);
    console.log("Demo login: sarah@vault.au / vault123");
  });
}

createServer(START_PORT);
