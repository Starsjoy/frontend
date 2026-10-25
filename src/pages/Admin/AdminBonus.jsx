import { useCallback, useEffect, useState } from "react";
import apiFetch from "../../utils/apiFetch";
import "./AdminBonus.css";

/**
 * Admin panel → 🎁 Bonuslar: umumiy statistika, almashtirilgan sovg'alar,
 * eng katta balanslar va har bir bonus yozuvi (kim, nima uchun, olinganmi, nimaga sarflangan).
 */

const PAGE = 30;

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
  admin: { icon: "🛠", label: "Admin" },
};

const fmt = (n) => Number(n || 0).toLocaleString("ru-RU");

const fmtDate = (iso) => {
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

export default function AdminBonus() {
  const [overview, setOverview] = useState(null);
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [kind, setKind] = useState("all");
  const [seen, setSeen] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadOverview = useCallback(async () => {
    try {
      const res = await apiFetch("/api/admin/rewards/overview");
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || "xato");
      setOverview(d);
    } catch (e) {
      setError(`Statistika yuklanmadi: ${e.message}`);
    }
  }, []);

  const loadEntries = useCallback(
    async (offset = 0) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) });
        if (kind !== "all") params.set("kind", kind);
        if (seen !== "all") params.set("seen", seen);
        if (query) params.set("search", query);
        const res = await apiFetch(`/api/admin/rewards/ledger?${params}`);
        const d = await res.json();
        if (!res.ok || !d.success) throw new Error(d.error || "xato");
        setEntries((cur) => (offset ? [...cur, ...d.entries] : d.entries));
        setTotal(d.total);
        setError("");
      } catch (e) {
        setError(`Ro'yxat yuklanmadi: ${e.message}`);
      } finally {
        setLoading(false);
      }
    },
    [kind, seen, query]
  );

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadEntries(0);
  }, [loadEntries]);

  // Qidiruv: yozish to'xtagach 350ms dan keyin
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const refresh = () => {
    loadOverview();
    loadEntries(0);
  };

  const t = overview?.totals || {};
  const p = overview?.periods || {};
  const u = overview?.unseen || {};

  return (
    <div className="tab-content ab-root">
      <div className="ab-head">
        <h3 className="ab-title">🎁 Bonuslar</h3>
        <button type="button" className="ab-refresh" onClick={refresh} disabled={loading}>
          🔄 Yangilash
        </button>
      </div>

      {error && <div className="ab-error">{error}</div>}

      {/* ===== Umumiy ===== */}
      <div className="ab-stats">
        <div className="ab-stat ab-stat--gold">
          <span className="ab-stat-label">Jami balans</span>
          <b className="ab-stat-value">{fmt(t.balance_total)} ⭐</b>
          <span className="ab-stat-sub">{fmt(t.users_with_balance)} userda</span>
        </div>
        <div className="ab-stat">
          <span className="ab-stat-label">Yig'ilgan</span>
          <b className="ab-stat-value ab-plus">+{fmt((t.earned_purchase || 0) + (t.earned_referral || 0))} ⭐</b>
          <span className="ab-stat-sub">
            xarid {fmt(t.earned_purchase)} · referal {fmt(t.earned_referral)}
          </span>
        </div>
        <div className="ab-stat">
          <span className="ab-stat-label">Sarflangan</span>
          <b className="ab-stat-value">−{fmt(t.redeemed)} ⭐</b>
          <span className="ab-stat-sub">
            {fmt(t.redeem_count)} marta · qaytarilgan {fmt(t.refunded)}
          </span>
        </div>
        <div className="ab-stat ab-stat--amber">
          <span className="ab-stat-label">Olinmagan</span>
          <b className="ab-stat-value">{fmt(u.stars)} ⭐</b>
          <span className="ab-stat-sub">
            {fmt(u.entries)} ta bonus · {fmt(u.users)} user
          </span>
        </div>
      </div>

      <div className="ab-periods">
        <span>
          Bugun: <b className="ab-plus">+{fmt(p.earned_day)}</b> / <b>−{fmt(p.redeemed_day)}</b>
        </span>
        <span>
          7 kun: <b className="ab-plus">+{fmt(p.earned_week)}</b> / <b>−{fmt(p.redeemed_week)}</b>
        </span>
        <span>
          Bonus olgan: <b>{fmt(t.earners)}</b> user
        </span>
      </div>

      <div className="ab-grid">
        {/* ===== Nimaga almashtirilgan ===== */}
        <section className="ab-card">
          <h4 className="ab-card-title">Nimaga almashtirildi</h4>
          {!overview?.items?.length ? (
            <p className="ab-empty">Hali hech kim bonusni almashtirmagan</p>
          ) : (
            <ul className="ab-items">
              {overview.items.map((it) => (
                <li key={it.item || "?"}>
                  <span className="ab-item-name">{ITEM_LABEL[it.item] || it.item}</span>
                  <span className="ab-item-count">
                    {fmt(it.count)} marta · {fmt(it.stars)}⭐
                  </span>
                  <span className="ab-item-status">
                    ✅ {it.delivered} · ⏳ {it.in_progress} · ↩️ {it.refunded}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ===== Eng katta balanslar ===== */}
        <section className="ab-card">
          <h4 className="ab-card-title">Eng katta balanslar</h4>
          {!overview?.top_users?.length ? (
            <p className="ab-empty">Hali hech kimda bonus yo'q</p>
          ) : (
            <ol className="ab-top">
              {overview.top_users.map((x, i) => (
                <li key={x.user_id}>
                  <span className="ab-top-rank">{i + 1}</span>
                  <button type="button" className="ab-top-user" onClick={() => setSearch(x.username || x.user_id)}>
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

      {/* ===== Har bir yozuv ===== */}
      <section className="ab-card">
        <div className="ab-list-head">
          <h4 className="ab-card-title">Bonuslar tarixi <span className="ab-count">{fmt(total)}</span></h4>
          <input
            className="ab-search"
            type="search"
            placeholder="Username yoki ID bo'yicha qidirish"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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

        {entries.length === 0 && !loading ? (
          <p className="ab-empty">Yozuv topilmadi</p>
        ) : (
          <ul className="ab-list">
            {entries.map((e) => {
              const meta = KIND_META[e.kind] || KIND_META.admin;
              const badge = statusBadge(e);
              return (
                <li key={e.id} className="ab-row">
                  <span className="ab-row-ic">{meta.icon}</span>
                  <div className="ab-row-main">
                    <div className="ab-row-top">
                      <button type="button" className="ab-row-user" onClick={() => setSearch(e.username || e.user_id)}>
                        @{e.username || e.user_id}
                      </button>
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

        {entries.length < total && (
          <button type="button" className="ab-more" disabled={loading} onClick={() => loadEntries(entries.length)}>
            {loading ? "Yuklanmoqda…" : `Yana ko'rsatish (${fmt(total - entries.length)})`}
          </button>
        )}
      </section>
    </div>
  );
}
