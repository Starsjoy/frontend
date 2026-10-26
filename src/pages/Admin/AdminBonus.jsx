import { useCallback, useEffect, useState } from "react";
import apiFetch from "../../utils/apiFetch";
import "./AdminBonus.css";

/**
 * Admin panel → 🎁 Bonuslar. Uch bo'lim:
 *   Asosiy           — umumiy statistika, almashtirilganlar, umumiy tarix
 *   Foydalanuvchilar — bonusi bor userlar (balans bo'yicha, 10 tadan sahifalab)
 *   Profil           — tanlangan userning bonuslari, xaridlari va tarixi
 * Istalgan joyda username bosilsa — shu userning profili ochiladi.
 */

const PAGE = 10;

const ITEM_LABEL = {
  gift15: "🧸 Ayiqcha (15⭐)",
  gift25: "🎁 Sovg'a (25⭐)",
  stars50: "⭐ 50 Stars",
  stars100: "⭐ 100 Stars",
};

const KIND_FILTERS = [
  ["all", "Hammasi"],
  ["purchase", "🛒 Xarid"],
  ["referral", "👥 Referal"],
  ["redeem", "🎁 Sarflangan"],
  ["refund", "↩️ Qaytarilgan"],
  ["admin", "🛠 Admin"],
  ["deduct", "➖ Ayirilgan"],
];

const SEEN_FILTERS = [
  ["all", "Hammasi"],
  ["seen", "✓ Olingan"],
  ["unseen", "⏳ Olinmagan"],
];

const KIND_META = {
  purchase: { icon: "🛒", label: "Xarid" },
  referral: { icon: "👥", label: "Referal" },
  redeem: { icon: "🎁", label: "Sarflandi" },
  refund: { icon: "↩️", label: "Qaytarildi" },
  admin: { icon: "🛠", label: "Admin bonusi" },
  deduct: { icon: "➖", label: "Admin ayirdi" },
};

const fmt = (n) => Number(n || 0).toLocaleString("ru-RU");

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (x) => String(x).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

function productLabel(e) {
  const type = String(e.order_type || "");
  if (type === "gift") return `Gift (${e.type_amount}⭐)`;
  if (type.includes("premium")) return `Premium ${e.type_amount} oy`;
  if (type.includes("stars")) return `${fmt(e.type_amount)} Stars`;
  return "";
}

function describe(e) {
  const order = e.order_id ? ` · #${e.order_id}` : "";
  const to = e.recipient_username ? ` → @${e.recipient_username}` : "";
  switch (e.kind) {
    case "purchase":
      return `${productLabel(e)} xaridi${to}${order}${e.summ ? ` · ${fmt(e.summ)} so'm` : ""}`;
    case "referral":
      return `Do'sti ${e.friend_username ? `@${e.friend_username}` : ""} xaridi: ${productLabel(e)}${order}`;
    case "redeem":
      return `${ITEM_LABEL[e.item] || e.item || "Sovg'a"}${to}${order}`;
    case "refund":
      return `Yetkazilmadi, balansga qaytarildi${order}`;
    case "admin":
      return `Admin ${e.admin_username ? `@${e.admin_username}` : ""} berdi${e.reason ? `: ${e.reason}` : ""}`;
    case "deduct":
      return `Admin ${e.admin_username ? `@${e.admin_username}` : ""} ayirdi (userga ko'rinmaydi)${e.reason ? `: ${e.reason}` : ""}`;
    default:
      return "Admin tomonidan";
  }
}

function statusBadge(e) {
  if (e.kind === "redeem") {
    const s = e.order_status;
    if (s === "completed" || s === "delivered") return ["ok", "Yetkazildi"];
    if (s === "pending" || s === "processing") return ["wait", "Yuborilmoqda"];
    if (s === "cancelled") return ["muted", "Qaytarildi"];
    if (s === "failed" || s === "error") return ["bad", "Xato"];
    return ["muted", s || "—"];
  }
  if (e.delta > 0) return e.seen ? ["ok", "✓ Olingan"] : ["wait", "⏳ Olinmagan"];
  return null;
}

/** ‹ 1 … 4 5 6 … 20 › */
function Pagination({ page, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / PAGE));
  if (pages <= 1) return null;
  const nums = [];
  for (let i = 1; i <= pages; i += 1) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  return (
    <nav className="ab-pager" aria-label="Sahifalar">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Oldingi">‹</button>
      {nums.map((n, i) =>
        n === "…" ? (
          <span key={`d${i}`} className="ab-pager-dots">…</span>
        ) : (
          <button key={n} type="button" className={n === page ? "is-active" : ""} onClick={() => onChange(n)}>
            {n}
          </button>
        )
      )}
      <button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Keyingi">›</button>
    </nav>
  );
}

/** Bonus yozuvlari ro'yxati (filtrlar + sahifalash). userId berilsa — faqat shu user. */
function LedgerList({ userId = null, onOpenUser, refreshKey }) {
  const [kind, setKind] = useState("all");
  const [seen, setSeen] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ entries: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [kind, seen, query, userId]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams({ limit: String(PAGE), offset: String((page - 1) * PAGE) });
    if (userId) params.set("user_id", userId);
    if (kind !== "all") params.set("kind", kind);
    if (seen !== "all") params.set("seen", seen);
    if (query && !userId) params.set("search", query);
    apiFetch(`/api/admin/rewards/ledger?${params}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!alive) return;
        if (!ok || !d.success) throw new Error(d.error || "xato");
        setData({ entries: d.entries, total: d.total });
        setError("");
      })
      .catch((e) => alive && setError(`Ro'yxat yuklanmadi: ${e.message}`))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [userId, kind, seen, query, page, refreshKey]);

  return (
    <section className="ab-card">
      <div className="ab-list-head">
        <h4 className="ab-card-title">
          Bonuslar tarixi <span className="ab-count">{fmt(data.total)}</span>
        </h4>
        {!userId && (
          <input
            className="ab-search"
            type="search"
            placeholder="Username yoki ID bo'yicha"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
      </div>
      <div className="ab-chips">
        {KIND_FILTERS.map(([key, label]) => (
          <button key={key} type="button" className={`ab-chip ${kind === key ? "is-active" : ""}`} onClick={() => setKind(key)}>
            {label}
          </button>
        ))}
        <span className="ab-chips-sep" />
        {SEEN_FILTERS.map(([key, label]) => (
          <button key={key} type="button" className={`ab-chip ${seen === key ? "is-active" : ""}`} onClick={() => setSeen(key)}>
            {label}
          </button>
        ))}
      </div>

      {error && <div className="ab-error">{error}</div>}

      {data.entries.length === 0 && !loading ? (
        <p className="ab-empty">Yozuv topilmadi</p>
      ) : (
        <ul className={`ab-list ${loading ? "is-loading" : ""}`}>
          {data.entries.map((e) => {
            const meta = KIND_META[e.kind] || KIND_META.admin;
            const badge = statusBadge(e);
            return (
              <li key={e.id} className="ab-row">
                <span className="ab-row-ic">{meta.icon}</span>
                <div className="ab-row-main">
                  <div className="ab-row-top">
                    {!userId && (
                      <button type="button" className="ab-link" onClick={() => onOpenUser(e.user_id)}>
                        @{e.username || e.user_id}
                      </button>
                    )}
                    <span className="ab-pill">{meta.label}</span>
                    {badge && <span className={`ab-pill ab-pill--${badge[0]}`}>{badge[1]}</span>}
                  </div>
                  <span className="ab-row-desc">{describe(e)}</span>
                  <span className="ab-row-date">{fmtDate(e.created_at)}</span>
                </div>
                <b className={`ab-row-delta ${e.delta > 0 ? "ab-plus" : "ab-minus"}`}>
                  {e.delta > 0 ? `+${e.delta}` : `−${Math.abs(e.delta)}`} ⭐
                </b>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={page} total={data.total} onChange={setPage} />
    </section>
  );
}

/* ================= ASOSIY ================= */
function HomeView({ onOpenUser, onShowUsers, refreshKey }) {
  const [o, setO] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    apiFetch("/api/admin/rewards/overview")
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!alive) return;
        if (!ok || !d.success) throw new Error(d.error || "xato");
        setO(d);
        setError("");
      })
      .catch((e) => alive && setError(`Statistika yuklanmadi: ${e.message}`));
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  const t = o?.totals || {};
  const p = o?.periods || {};
  const u = o?.unseen || {};

  return (
    <div className="ab-view">
      {error && <div className="ab-error">{error}</div>}
      <div className="ab-stats">
        <div className="ab-stat ab-stat--gold">
          <span className="ab-stat-label">Jami balans</span>
          <b className="ab-stat-value">{fmt(t.balance_total)} ⭐</b>
          <span className="ab-stat-sub">{fmt(t.users_with_balance)} userda</span>
        </div>
        <div className="ab-stat">
          <span className="ab-stat-label">Yig'ilgan</span>
          <b className="ab-stat-value ab-plus">+{fmt((t.earned_purchase || 0) + (t.earned_referral || 0) + (t.earned_admin || 0))} ⭐</b>
          <span className="ab-stat-sub">
            xarid {fmt(t.earned_purchase)} · referal {fmt(t.earned_referral)} · admin {fmt(t.earned_admin)}
            {t.deducted > 0 && ` · ayirilgan −${fmt(t.deducted)}`}
          </span>
        </div>
        <div className="ab-stat">
          <span className="ab-stat-label">Sarflangan</span>
          <b className="ab-stat-value">−{fmt(t.redeemed)} ⭐</b>
          <span className="ab-stat-sub">{fmt(t.redeem_count)} marta · qaytarilgan {fmt(t.refunded)}</span>
        </div>
        <div className="ab-stat ab-stat--amber">
          <span className="ab-stat-label">Olinmagan</span>
          <b className="ab-stat-value">{fmt(u.stars)} ⭐</b>
          <span className="ab-stat-sub">{fmt(u.entries)} ta bonus · {fmt(u.users)} user</span>
        </div>
      </div>

      <div className="ab-periods">
        <span>Bugun: <b className="ab-plus">+{fmt(p.earned_day)}</b> / <b>−{fmt(p.redeemed_day)}</b></span>
        <span>7 kun: <b className="ab-plus">+{fmt(p.earned_week)}</b> / <b>−{fmt(p.redeemed_week)}</b></span>
        <span>Bonus olgan: <b>{fmt(t.earners)}</b> user</span>
      </div>

      <div className="ab-grid">
        <section className="ab-card">
          <h4 className="ab-card-title">Nimaga almashtirildi</h4>
          {!o?.items?.length ? (
            <p className="ab-empty">Hali hech kim bonusni almashtirmagan</p>
          ) : (
            <ul className="ab-items">
              {o.items.map((it) => (
                <li key={it.item || "?"}>
                  <span className="ab-item-name">{ITEM_LABEL[it.item] || it.item}</span>
                  <span className="ab-item-count">{fmt(it.count)} marta · {fmt(it.stars)}⭐</span>
                  <span className="ab-item-status">✅ {it.delivered} · ⏳ {it.in_progress} · ↩️ {it.refunded}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ab-card">
          <div className="ab-list-head">
            <h4 className="ab-card-title">Eng katta balanslar</h4>
            <button type="button" className="ab-link" onClick={onShowUsers}>Hammasi →</button>
          </div>
          {!o?.top_users?.length ? (
            <p className="ab-empty">Hali hech kimda bonus yo'q</p>
          ) : (
            <ol className="ab-top">
              {o.top_users.slice(0, 5).map((x, i) => (
                <li key={x.user_id}>
                  <span className="ab-top-rank">{i + 1}</span>
                  <button type="button" className="ab-link ab-top-user" onClick={() => onOpenUser(x.user_id)}>
                    @{x.username || x.user_id}
                  </button>
                  {x.unseen > 0 && <span className="ab-pill ab-pill--wait">{x.unseen} olinmagan</span>}
                  <b className="ab-top-bal">{fmt(x.bonus_balance)} ⭐</b>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <LedgerList onOpenUser={onOpenUser} refreshKey={refreshKey} />
    </div>
  );
}

/* ================= FOYDALANUVCHILAR ================= */
function UsersView({ onOpenUser, refreshKey }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ users: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [query]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE) });
    if (query) params.set("search", query);
    apiFetch(`/api/admin/rewards/users?${params}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!alive) return;
        if (!ok || !d.success) throw new Error(d.error || "xato");
        setData({ users: d.users, total: d.total });
        setError("");
      })
      .catch((e) => alive && setError(`Ro'yxat yuklanmadi: ${e.message}`))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [query, page, refreshKey]);

  return (
    <div className="ab-view">
      <section className="ab-card">
        <div className="ab-list-head">
          <h4 className="ab-card-title">
            Bonusli foydalanuvchilar <span className="ab-count">{fmt(data.total)}</span>
          </h4>
          <input
            className="ab-search"
            type="search"
            placeholder="Username, ism yoki ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {error && <div className="ab-error">{error}</div>}
        {data.users.length === 0 && !loading ? (
          <p className="ab-empty">Foydalanuvchi topilmadi</p>
        ) : (
          <ul className={`ab-users ${loading ? "is-loading" : ""}`}>
            {data.users.map((x, i) => (
              <li key={x.user_id}>
                <button type="button" className="ab-user" onClick={() => onOpenUser(x.user_id)}>
                  <span className="ab-user-rank">{(page - 1) * PAGE + i + 1}</span>
                  <span className="ab-user-main">
                    <b>@{x.username || x.user_id}</b>
                    <small>
                      yig'gan +{fmt((x.earned_purchase || 0) + (x.earned_referral || 0))} · sarflagan −{fmt(x.spent)} · {fmtDate(x.last_at)}
                    </small>
                  </span>
                  {x.unseen_count > 0 && <span className="ab-pill ab-pill--wait">{x.unseen_count} olinmagan</span>}
                  <b className="ab-user-bal">{fmt(x.bonus_balance)} ⭐</b>
                  <span className="ab-user-arrow" aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} total={data.total} onChange={setPage} />
      </section>
    </div>
  );
}

/* ================= PROFIL ================= */
const GRANT_PRESETS = [5, 10, 25, 50];

/** Admin bonus berish oynasi */
function GrantModal({ user, onClose, onDone }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const n = Number(amount);
  const valid = Number.isInteger(n) && n >= 1 && n <= 1000;

  const submit = async () => {
    if (!valid || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await apiFetch(`/api/admin/rewards/user/${encodeURIComponent(user.user_id)}/grant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: n, reason: reason.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(d.error || "xato");
      onDone(n);
    } catch (e) {
      setError(e.message);
      setSending(false);
    }
  };

  return (
    <div className="ab-overlay">
      <div className="ab-modal" role="dialog" aria-modal="true">
        <button type="button" className="ab-modal-x" onClick={onClose} aria-label="Yopish">✕</button>
        <h4 className="ab-modal-title">🎁 Bonus berish</h4>
        <p className="ab-modal-sub">@{user.username || user.user_id} balansiga darhol qo'shiladi va userga xabar boradi</p>
        <label className="ab-field">
          <span>Miqdor (⭐)</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="1000"
            placeholder="Masalan, 10"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
            autoFocus
          />
        </label>
        <div className="ab-chips">
          {GRANT_PRESETS.map((v) => (
            <button key={v} type="button" className={`ab-chip ${n === v ? "is-active" : ""}`} onClick={() => setAmount(String(v))}>
              +{v} ⭐
            </button>
          ))}
        </div>
        <label className="ab-field">
          <span>Sabab (ixtiyoriy, userga ko'rinadi)</span>
          <textarea
            rows={2}
            maxLength={200}
            placeholder="Masalan: kechikish uchun uzr"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        {amount && !valid && <p className="ab-modal-err">Miqdor 1 dan 1000 gacha bo'lishi kerak</p>}
        {error && <p className="ab-modal-err">{error}</p>}
        <button type="button" className="ab-modal-cta" disabled={!valid || sending} onClick={submit}>
          {sending ? "Yuborilmoqda…" : valid ? `+${n} ⭐ bonus berish` : "Bonus berish"}
        </button>
        <button type="button" className="ab-modal-cancel" onClick={onClose}>Bekor qilish</button>
      </div>
    </div>
  );
}

/** Admin bonusni ayirish / nolga tushirish oynasi — userga xabar bormaydi */
function DeductModal({ user, onClose, onDone }) {
  const balance = Number(user.bonus_balance) || 0;
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const n = Number(amount);
  const valid = Number.isInteger(n) && n >= 1 && n <= balance;

  const submit = async (all) => {
    if (sending || (!all && !valid)) return;
    if (all && !window.confirm(`@${user.username || user.user_id} balansi (${balance} ⭐) butunlay 0 ga tushirilsinmi?`)) return;
    setSending(true);
    setError("");
    try {
      const res = await apiFetch(`/api/admin/rewards/user/${encodeURIComponent(user.user_id)}/deduct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(all ? { all: true, reason: reason.trim() } : { amount: n, reason: reason.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(d.error || "xato");
      onDone(d.deducted, d.balance);
    } catch (e) {
      setError(e.message);
      setSending(false);
    }
  };

  return (
    <div className="ab-overlay">
      <div className="ab-modal" role="dialog" aria-modal="true">
        <button type="button" className="ab-modal-x" onClick={onClose} aria-label="Yopish">✕</button>
        <h4 className="ab-modal-title">➖ Bonusni ayirish</h4>
        <p className="ab-modal-sub">
          @{user.username || user.user_id} balansi: <b>{fmt(balance)} ⭐</b>. Userga xabar bormaydi va uning tarixida ko'rinmaydi
        </p>
        <label className="ab-field">
          <span>Ayiriladigan miqdor (⭐)</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max={balance}
            placeholder="Masalan, 10"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
            autoFocus
          />
        </label>
        <label className="ab-field">
          <span>Sabab (ixtiyoriy, faqat adminlarga ko'rinadi)</span>
          <textarea
            rows={2}
            maxLength={200}
            placeholder="Masalan: noto'g'ri berilgan bonus"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        {amount && !valid && <p className="ab-modal-err">Miqdor 1 dan {balance} gacha bo'lishi kerak</p>}
        {error && <p className="ab-modal-err">{error}</p>}
        <button type="button" className="ab-modal-cta" disabled={!valid || sending} onClick={() => submit(false)}>
          {sending ? "Bajarilmoqda…" : valid ? `−${n} ⭐ ayirish` : "Ayirish"}
        </button>
        <button type="button" className="ab-modal-cta ab-modal-cta--danger" disabled={balance <= 0 || sending} onClick={() => submit(true)}>
          🗑 Hammasini 0 ga tushirish
        </button>
        <button type="button" className="ab-modal-cancel" onClick={onClose}>Bekor qilish</button>
      </div>
    </div>
  );
}

function ProfileView({ userId, onBack, onOpenUser, refreshKey }) {
  const [p, setP] = useState(null);
  const [error, setError] = useState("");
  const [grantOpen, setGrantOpen] = useState(false);
  const [deductOpen, setDeductOpen] = useState(false);
  const [grantKey, setGrantKey] = useState(0);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    setP(null);
    apiFetch(`/api/admin/rewards/user/${encodeURIComponent(userId)}`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!alive) return;
        if (!ok || !d.success) throw new Error(d.error || "xato");
        setP(d);
        setError("");
      })
      .catch((e) => alive && setError(`Profil yuklanmadi: ${e.message}`));
    return () => {
      alive = false;
    };
  }, [userId, refreshKey, grantKey]);

  const b = p?.bonus || {};
  const pu = p?.purchases || {};

  return (
    <div className="ab-view">
      <button type="button" className="ab-back" onClick={onBack}>← Foydalanuvchilar</button>
      {error && <div className="ab-error">{error}</div>}
      {!p && !error && <p className="ab-empty">Yuklanmoqda…</p>}
      {p && (
        <>
          <section className="ab-card ab-profile">
            <div className="ab-avatar">{String(p.user.username || "?").slice(0, 1).toUpperCase()}</div>
            <div className="ab-profile-main">
              <b className="ab-profile-name">@{p.user.username || p.user.user_id}</b>
              <span className="ab-profile-sub">
                {p.user.name || "—"} · ID {p.user.user_id} · {String(p.user.language || "uz").toUpperCase()}
              </span>
              <span className="ab-profile-sub">
                Ro'yxatdan o'tgan: {fmtDate(p.user.created_at)}
                {p.referrer && (
                  <>
                    {" "}· taklif qilgan:{" "}
                    <button type="button" className="ab-link" onClick={() => onOpenUser(p.referrer.user_id)}>
                      @{p.referrer.username || p.referrer.user_id}
                    </button>
                  </>
                )}
              </span>
            </div>
            <div className="ab-profile-bal">
              <span>Balans</span>
              <b>{fmt(p.user.bonus_balance)} ⭐</b>
              <button type="button" className="ab-grant-btn" onClick={() => setGrantOpen(true)}>🎁 Bonus berish</button>
              <button
                type="button"
                className="ab-grant-btn ab-deduct-btn"
                disabled={!p.user.bonus_balance}
                onClick={() => setDeductOpen(true)}
              >
                ➖ Ayirish
              </button>
            </div>
          </section>
          {notice && <div className="ab-notice">{notice}</div>}

          <div className="ab-stats">
            <div className="ab-stat">
              <span className="ab-stat-label">Yig'gan</span>
              <b className="ab-stat-value ab-plus">+{fmt((b.earned_purchase || 0) + (b.earned_referral || 0) + (b.earned_admin || 0))} ⭐</b>
              <span className="ab-stat-sub">
                xarid {fmt(b.earned_purchase)} · referal {fmt(b.earned_referral)} · admin {fmt(b.earned_admin)}
                {b.deducted > 0 && ` · ayirilgan −${fmt(b.deducted)}`}
              </span>
            </div>
            <div className="ab-stat">
              <span className="ab-stat-label">Sarflagan</span>
              <b className="ab-stat-value">−{fmt(b.spent)} ⭐</b>
              <span className="ab-stat-sub">{fmt(b.redeem_count)} marta · qaytarilgan {fmt(b.refunded)}</span>
            </div>
            <div className="ab-stat ab-stat--amber">
              <span className="ab-stat-label">Olinmagan</span>
              <b className="ab-stat-value">{fmt(b.unseen_stars)} ⭐</b>
              <span className="ab-stat-sub">{fmt(b.unseen_count)} ta bonus</span>
            </div>
            <div className="ab-stat">
              <span className="ab-stat-label">Taklif qilgan do'stlari</span>
              <b className="ab-stat-value">{fmt(p.friends)}</b>
              <span className="ab-stat-sub">referal orqali kelgan</span>
            </div>
          </div>

          <section className="ab-card">
            <h4 className="ab-card-title">Xaridlari</h4>
            <div className="ab-kv">
              <span>Buyurtmalar</span><b>{fmt(pu.orders_count)} ta</b>
              <span>Stars</span><b>{fmt(pu.stars_bought)} ⭐</b>
              <span>Premium</span><b>{fmt(pu.premium_months)} oy</b>
              <span>Gift</span><b>{fmt(pu.gifts_count)} ta</b>
              <span>Jami to'lagan</span><b className="ab-gold">{fmt(pu.total_spent)} so'm</b>
              <span>Oxirgi xarid</span><b>{fmtDate(pu.last_order_at)}</b>
            </div>
          </section>

          <LedgerList userId={userId} onOpenUser={onOpenUser} refreshKey={refreshKey + grantKey} />
        </>
      )}
      {grantOpen && p && (
        <GrantModal
          user={p.user}
          onClose={() => setGrantOpen(false)}
          onDone={(n) => {
            setGrantOpen(false);
            setNotice(`✅ +${n} ⭐ bonus berildi, userga xabar yuborildi`);
            setTimeout(() => setNotice(""), 4000);
            setGrantKey((k) => k + 1);
          }}
        />
      )}
      {deductOpen && p && (
        <DeductModal
          user={p.user}
          onClose={() => setDeductOpen(false)}
          onDone={(n, bal) => {
            setDeductOpen(false);
            setNotice(`✅ −${n} ⭐ ayirildi (yangi balans ${bal} ⭐), userga xabar yuborilmadi`);
            setTimeout(() => setNotice(""), 4000);
            setGrantKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}

export default function AdminBonus() {
  const [view, setView] = useState("home");
  const [userId, setUserId] = useState(null);
  const [userLabel, setUserLabel] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const openUser = useCallback((id) => {
    if (!id) return;
    setUserId(String(id));
    setUserLabel("");
    setView("profile");
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  }, []);

  // Profil tab sarlavhasi uchun username
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    apiFetch(`/api/admin/rewards/user/${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) => alive && setUserLabel(d?.user?.username || userId))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId]);

  return (
    <div className="tab-content ab-root">
      <div className="ab-head">
        <h3 className="ab-title">🎁 Bonuslar</h3>
        <button type="button" className="ab-refresh" onClick={() => setRefreshKey((k) => k + 1)}>🔄</button>
      </div>

      <nav className="ab-tabs" role="tablist">
        <button type="button" role="tab" className={view === "home" ? "is-active" : ""} onClick={() => setView("home")}>
          Asosiy
        </button>
        <button type="button" role="tab" className={view === "users" ? "is-active" : ""} onClick={() => setView("users")}>
          Foydalanuvchilar
        </button>
        <button
          type="button"
          role="tab"
          className={view === "profile" ? "is-active" : ""}
          disabled={!userId}
          onClick={() => setView("profile")}
          title={userId ? "" : "Avval foydalanuvchini tanlang"}
        >
          {userId ? `@${userLabel || "…"}` : "Profil"}
        </button>
      </nav>

      <div key={view} className="ab-pane">
        {view === "home" && <HomeView onOpenUser={openUser} onShowUsers={() => setView("users")} refreshKey={refreshKey} />}
        {view === "users" && <UsersView onOpenUser={openUser} refreshKey={refreshKey} />}
        {view === "profile" && userId && (
          <ProfileView userId={userId} onBack={() => setView("users")} onOpenUser={openUser} refreshKey={refreshKey} />
        )}
      </div>
    </div>
  );
}
