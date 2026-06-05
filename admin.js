const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

let db = null;
let _activeAdminTab = "overview";
let _logFilter = "all";

const money = value => new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD"
}).format(Number(value || 0));

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2400);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function loadAdmin() {
  db = await api("/api/db");
  renderAll();
}

function renderAll() {
  renderUsers();
  renderSettings();
  renderTransactions();
  renderBudgets();
  renderMetals();
  renderSplits();
  renderGoals();
  renderCards();
  renderActions();
}

/* ── Users ────────────────────────────────────────────────────────────── */
function renderUsers() {
  const el = $("#adminUsers");
  if (!el) return;
  el.innerHTML = db.users.map(user => `
    <div class="admin-user">
      <h3>${user.name} <small>${user.email}</small></h3>
      ${field("Balance ($)", "balance", user.balance, user.id)}
      ${field("Monthly income ($)", "monthlyIncome", user.monthlyIncome, user.id)}
      ${field("Trust score", "trustScore", user.trustScore, user.id)}
      ${field("Name", "name", user.name, user.id)}
    </div>
  `).join("");
}

function field(label, fieldName, value, userId) {
  return `
    <label class="admin-field">
      <span>${label}</span>
      <input value="${value}" data-user="${userId}" data-field="${fieldName}" />
      <button class="button soft small" data-update-user="${userId}" data-field="${fieldName}">Save</button>
    </label>
  `;
}

/* ── Settings ─────────────────────────────────────────────────────────── */
function renderSettings() {
  const el = $("#adminSettings");
  if (!el) return;
  el.innerHTML = Object.entries(db.settings).map(([key, value]) => `
    <label class="admin-field">
      <span>${key}</span>
      <input value="${value}" data-setting="${key}" />
      <button class="button soft small" data-update-setting="${key}">Save</button>
    </label>
  `).join("");
}

/* ── Transactions ─────────────────────────────────────────────────────── */
function renderTransactions() {
  const el = $("#adminTransactions");
  if (!el) return;
  const rows = Object.entries(db.transactions).flatMap(([userId, items]) => {
    const user = db.users.find(item => item.id === userId);
    return items.map(tx => ({ ...tx, user: user?.name || userId }));
  });
  el.innerHTML = rows.slice(0, 20).map(tx => `
    <div class="list-row">
      <span><b>${tx.title}</b><br><small>${tx.user} · ${tx.category} · ${tx.date}${tx.receiptId ? ` · ${tx.receiptId}` : ''}</small></span>
      <strong class="${tx.amount >= 0 ? "positive" : "negative"}">${tx.amount >= 0 ? "+" : ""}${money(tx.amount)}</strong>
    </div>
  `).join("") || `<p class="form-note">No transactions.</p>`;
}

/* ── Budgets ──────────────────────────────────────────────────────────── */
function renderBudgets() {
  const el = $("#adminBudgets");
  if (!el) return;
  const sections = Object.entries(db.budgets).map(([userId, budgets]) => {
    const user = db.users.find(u => u.id === userId);
    const rows = budgets.map(b => `
      <div class="admin-data-row">
        <span class="admin-data-label">${b.name}</span>
        <label class="admin-inline-field">Spent
          <input value="${b.spent}" data-section="budget" data-userid="${userId}" data-budgetid="${b.id}" data-field="spent" style="width:80px" />
          <button class="button soft small" data-admin-save="budget:${userId}:${b.id}:spent">Save</button>
        </label>
        <label class="admin-inline-field">Limit
          <input value="${b.limit}" data-section="budget" data-userid="${userId}" data-budgetid="${b.id}" data-field="limit" style="width:80px" />
          <button class="button soft small" data-admin-save="budget:${userId}:${b.id}:limit">Save</button>
        </label>
        <button class="button ghost small danger-text" data-admin-delete="budget:${userId}:${b.id}">Delete</button>
      </div>`).join("");
    return `<div class="admin-user"><h3>${user?.name || userId}</h3>${rows || '<p class="form-note">No budgets.</p>'}</div>`;
  }).join("");
  el.innerHTML = sections || `<p class="form-note">No budget data.</p>`;
}

/* ── Metals ───────────────────────────────────────────────────────────── */
function renderMetals() {
  const el = $("#adminMetals");
  if (!el) return;
  const sections = Object.entries(db.metals).map(([userId, metals]) => {
    const user = db.users.find(u => u.id === userId);
    return `
      <div class="admin-user">
        <h3>${user?.name || userId}</h3>
        <label class="admin-field">
          <span>Gold (grams)</span>
          <input value="${metals.gold}" data-section="metals" data-userid="${userId}" data-field="gold" />
          <button class="button soft small" data-admin-save="metals:${userId}::gold">Save</button>
        </label>
        <label class="admin-field">
          <span>Silver (grams)</span>
          <input value="${metals.silver}" data-section="metals" data-userid="${userId}" data-field="silver" />
          <button class="button soft small" data-admin-save="metals:${userId}::silver">Save</button>
        </label>
      </div>`;
  }).join("");
  el.innerHTML = sections || `<p class="form-note">No metals data.</p>`;
}

/* ── Splits ───────────────────────────────────────────────────────────── */
function renderSplits() {
  const el = $("#adminSplits");
  if (!el) return;
  const sections = Object.entries(db.splits).map(([userId, splits]) => {
    const user = db.users.find(u => u.id === userId);
    if (!splits.length) return `<div class="admin-user"><h3>${user?.name || userId}</h3><p class="form-note">No splits.</p></div>`;
    const rows = splits.map(s => `
      <div class="admin-data-row">
        <span class="admin-data-label">${s.name} <small>(${s.friend})</small></span>
        <span class="${s.status === 'owe' ? 'negative' : s.status === 'owed' ? 'positive' : ''}">${money(s.amount)} · ${s.status}</span>
        <label class="admin-inline-field">Status
          <select data-section="split" data-userid="${userId}" data-splitid="${s.id}" data-field="status">
            <option ${s.status === 'owe' ? 'selected' : ''}>owe</option>
            <option ${s.status === 'owed' ? 'selected' : ''}>owed</option>
            <option ${s.status === 'settled' ? 'selected' : ''}>settled</option>
          </select>
          <button class="button soft small" data-admin-save="split:${userId}:${s.id}:status">Save</button>
        </label>
      </div>`).join("");
    return `<div class="admin-user"><h3>${user?.name || userId}</h3>${rows}</div>`;
  }).join("");
  el.innerHTML = sections || `<p class="form-note">No splits data.</p>`;
}

/* ── Goals ────────────────────────────────────────────────────────────── */
function renderGoals() {
  const el = $("#adminGoals");
  if (!el) return;
  const sections = Object.entries(db.savings).map(([userId, savings]) => {
    const user = db.users.find(u => u.id === userId);
    const goals = savings.goals || [];
    if (!goals.length) return `<div class="admin-user"><h3>${user?.name || userId}</h3><p class="form-note">No goals.</p></div>`;
    const rows = goals.map(g => {
      const pct = Math.min(100, Math.round((g.current / g.target) * 100));
      return `
        <div class="admin-data-row">
          <span class="admin-data-label">${g.name}</span>
          <span>${money(g.current)} of ${money(g.target)} (${pct}%)</span>
          <label class="admin-inline-field">Current
            <input value="${g.current}" data-section="goal" data-userid="${userId}" data-goalid="${g.id}" data-field="current" style="width:90px" />
            <button class="button soft small" data-admin-save="goal:${userId}:${g.id}:current">Save</button>
          </label>
          <label class="admin-inline-field">Target
            <input value="${g.target}" data-section="goal" data-userid="${userId}" data-goalid="${g.id}" data-field="target" style="width:90px" />
            <button class="button soft small" data-admin-save="goal:${userId}:${g.id}:target">Save</button>
          </label>
        </div>`;
    }).join("");
    return `<div class="admin-user"><h3>${user?.name || userId}</h3>${rows}</div>`;
  }).join("");
  el.innerHTML = sections || `<p class="form-note">No goals data.</p>`;
}

/* ── Cards ────────────────────────────────────────────────────────────── */
function renderCards() {
  const el = $("#adminCards");
  if (!el) return;
  const sections = Object.entries(db.cards).map(([userId, card]) => {
    const user = db.users.find(u => u.id === userId);
    return `
      <div class="admin-user">
        <h3>${user?.name || userId} <small>···${card.last4}</small></h3>
        <label class="admin-field">
          <span>Status</span>
          <select data-section="card" data-userid="${userId}" data-field="status">
            <option ${card.status === 'Active' ? 'selected' : ''}>Active</option>
            <option ${card.status === 'Frozen' ? 'selected' : ''}>Frozen</option>
          </select>
          <button class="button soft small" data-admin-save="card:${userId}::status">Save</button>
        </label>
        <label class="admin-field">
          <span>Daily limit ($)</span>
          <input value="${card.dailyLimit}" data-section="card" data-userid="${userId}" data-field="dailyLimit" />
          <button class="button soft small" data-admin-save="card:${userId}::dailyLimit">Save</button>
        </label>
        <label class="admin-field">
          <span>PIN (4 digits)</span>
          <input value="${card.pin}" maxlength="4" data-section="card" data-userid="${userId}" data-field="pin" />
          <button class="button soft small" data-admin-save="card:${userId}::pin">Save</button>
        </label>
      </div>`;
  }).join("");
  el.innerHTML = sections || `<p class="form-note">No card data.</p>`;
}

/* ── Action log ───────────────────────────────────────────────────────── */
function renderActions() {
  const el = $("#adminActions");
  if (!el) return;
  const filtered = _logFilter === "all" ? db.actions : db.actions.filter(a => a.action === _logFilter);
  el.innerHTML = filtered.slice(0, 40).map(action => `
    <div class="list-row">
      <span><b>${action.action}</b><br><small>${action.detail}</small></span>
      <small>${new Date(action.at).toLocaleString("en-AU")}</small>
    </div>
  `).join("") || `<p class="form-note">No actions in this category.</p>`;
}

/* ── Tab switching ────────────────────────────────────────────────────── */
function setAdminTab(tab) {
  _activeAdminTab = tab;
  $$("[data-admin-tab]").forEach(btn => btn.classList.toggle("active", btn.dataset.adminTab === tab));
  $$(".admin-tab-panel").forEach(p => p.classList.toggle("active", p.id === `adminTab-${tab}`));
  $$(".admin-tab-panel").forEach(p => p.classList.toggle("hidden", p.id !== `adminTab-${tab}`));
}

/* ── Generic save helper ──────────────────────────────────────────────── */
async function adminSave(section, userId, subId, field, value) {
  const payload = { section };
  if (userId) payload.userId = userId;
  if (field)  payload.field  = field;
  if (value !== undefined) payload.value = value;
  if (section === "budget" || section === "delete-budget") payload.budgetId = subId;
  if (section === "split")  payload.splitId  = subId;
  if (section === "goal")   payload.goalId   = subId;
  if (section === "add-budget") {
    payload.name  = subId;
    payload.limit = field;
  }
  db = await api("/api/admin/update", { method: "POST", body: JSON.stringify(payload) });
  renderAll();
}

/* ── Event listeners ──────────────────────────────────────────────────── */
document.addEventListener("click", async event => {
  const t = event.target;

  /* Tab switch */
  if (t.dataset.adminTab) { setAdminTab(t.dataset.adminTab); return; }

  /* Log filter */
  if (t.dataset.logFilter) {
    $$("[data-log-filter]").forEach(b => b.classList.remove("active"));
    t.classList.add("active");
    _logFilter = t.dataset.logFilter;
    renderActions();
    return;
  }

  /* Legacy user field save */
  if (t.dataset.updateUser) {
    const field = t.dataset.field;
    const input = document.querySelector(`[data-user="${t.dataset.updateUser}"][data-field="${field}"]`);
    try {
      db = await api("/api/admin/update", {
        method: "POST",
        body: JSON.stringify({ section: "user", userId: t.dataset.updateUser, field, value: input.value })
      });
      renderAll(); toast("User data saved.");
    } catch (err) { toast(err.message); }
    return;
  }

  /* Legacy setting save */
  if (t.dataset.updateSetting) {
    const input = document.querySelector(`[data-setting="${t.dataset.updateSetting}"]`);
    try {
      db = await api("/api/admin/update", {
        method: "POST",
        body: JSON.stringify({ section: "settings", field: t.dataset.updateSetting, value: input.value })
      });
      renderAll(); toast("Setting saved.");
    } catch (err) { toast(err.message); }
    return;
  }

  /* Generic admin save via data-admin-save="section:userId:subId:field" */
  if (t.dataset.adminSave) {
    const [section, userId, subId, field] = t.dataset.adminSave.split(":");
    /* Find the matching input or select */
    const inputEl = t.closest(".admin-field, .admin-inline-field, .admin-data-row")
      ?.querySelector(`input[data-field="${field}"], select[data-field="${field}"]`);
    if (!inputEl) return toast("Could not find input.");
    try {
      await adminSave(section, userId, subId, field, inputEl.value);
      toast("Saved.");
    } catch (err) { toast(err.message); }
    return;
  }

  /* Delete budget */
  if (t.dataset.adminDelete) {
    if (!confirm("Delete this record?")) return;
    const [section, userId, subId] = t.dataset.adminDelete.split(":");
    try {
      await adminSave(`delete-${section}`, userId, subId, null, null);
      toast("Deleted.");
    } catch (err) { toast(err.message); }
    return;
  }

  /* Reset demo data */
  if (t.id === "resetDemoBtn") {
    if (!confirm("Reset all demo data to factory defaults?")) return;
    try {
      db = await api("/api/admin/update", { method: "POST", body: JSON.stringify({ section: "reset-demo" }) });
      renderAll(); toast("Demo data reset.");
    } catch (err) { toast(err.message); }
    return;
  }
});

$("#refreshAdmin").addEventListener("click", () => loadAdmin().then(() => toast("Admin data refreshed.")));
loadAdmin();
