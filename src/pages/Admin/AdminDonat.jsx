/** @jsxImportSource ./adminJsx */
import { useCallback, useEffect, useState } from "react";
import apiFetch from "../../utils/apiFetch";
import "./AdminPremiumWait.css";

const inputCss = `.dn-adm-input{padding:6px 8px;border-radius:8px;border:1px solid var(--pw-line, #333);background:transparent;color:inherit;font:inherit}`;

/**
 * Admin → 🎮 Donat (sayt orqali o'yin valyutasi: starsjoy.uz/donat).
 * Buyurtmalar, holat, "Qayta yuborish" (faqat to'langan va yetkazilmaganlar) va sozlamalar:
 * yoqish/o'chirish, USDT kursi, har o'yin uchun ustama foizi.
 */

const fmt = (n) => Number(n || 0).toLocaleString("ru-RU");
const hhmm = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (x) => String(x).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const STATUS = {
  completed: ["✅ Yetkazildi", "s-done"],
  processing: ["⏳ Yuborilyapti", "s-waiting"],
  failed: ["❌ Yetkazilmadi", "s-cancelled"],
  error: ["❌ Xato", "s-cancelled"],
  pending: ["🕓 To'lov kutilmoqda", "s-waiting"],
  expired: ["⌛ Muddati o'tdi", "s-cancelled"],
  cancelled: ["Bekor", "s-cancelled"],
};

export default function AdminDonat() {
  const [items, setItems] = useState([]);
  const [paidOnly, setPaidOnly] = useState(true);
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await apiFetch(`/api/admin/donat/orders?limit=100${paidOnly ? "&paid=1" : ""}`);
      const d = await r.json();
      if (!d.success) throw new Error(d.error || "Xato");
      setItems(d.items || []);
      setErr("");
    } catch (e) {
      setErr(e.message);
    }
  }, [paidOnly]);

  const loadSettings = useCallback(async () => {
    try {
      const r = await apiFetch("/api/admin/donat/settings");
      const d = await r.json();
      if (d.success) {
        setSettings(d);
        setDraft({ enabled: d.enabled, rate: d.rate, markups: { ...d.markups } });
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const resend = async (it) => {
    if (!window.confirm(`#${it.id} ni StarsPaymee'ga qayta yuborasizmi?\n${it.item_name} → ${it.player_id || "havola"}`)) return;
    setBusy(it.id);
    try {
      const r = await apiFetch(`/api/admin/donat/${it.id}/resend`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!d.success) alert(d.error || "Xato");
      else if (d.note) alert(d.note);
    } finally {
      setBusy(null);
      setTimeout(load, 1500);
    }
  };

  const saveSettings = async () => {
    setBusy("settings");
    try {
      const r = await apiFetch("/api/admin/donat/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: Boolean(draft.enabled),
          rate: Number(draft.rate),
          markups: Object.fromEntries(Object.entries(draft.markups).map(([k, v]) => [k, Number(v)])),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!d.success) alert(d.error || "Saqlanmadi");
      await loadSettings();
    } finally {
      setBusy(null);
    }
  };

  const paidCount = items.filter((x) => x.payment_status === "paid").length;
  const sum = items.filter((x) => x.status === "completed").reduce((a, x) => a + Number(x.summ || 0), 0);

  return (
    <div className="pw-root">
      <style>{inputCss}</style>
      <div className="pw-head" style={{ cursor: "default" }}>
        <span>🎮 Donat</span>
        <span className="pw-head-right">
          <span className="pw-badge">{paidCount}</span>
        </span>
      </div>
      <div className="pw-body">
        {settings && draft && (
          <div className="pw-card">
            <div className="pw-card-top">
              <b>Sozlamalar</b>
              <span className={`pw-status ${settings.enabled ? "s-done" : "s-cancelled"}`}>
                {settings.enabled ? "Yoqilgan" : "O'chiq"}
              </span>
            </div>
            <div className="pw-line">StarsPaymee balansi: <b>{settings.balance_usdt ?? "—"}</b> USDT</div>
            <label className="pw-line" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={Boolean(draft.enabled)}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              />
              Saytda donat sotuvi yoqilgan
            </label>
            <label className="pw-line" style={{ display: "flex", gap: 8, alignItems: "center" }}>
              1 USDT =
              <input
                className="dn-adm-input"
                style={{ width: 100 }}
                type="number"
                value={draft.rate}
                onChange={(e) => setDraft({ ...draft, rate: e.target.value })}
              />
              so'm
            </label>
            {settings.games.map((g) => (
              <label key={g.slug} className="pw-line" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {g.title} ustama:
                <input
                  className="dn-adm-input"
                  style={{ width: 70 }}
                  type="number"
                  value={draft.markups[g.slug]}
                  onChange={(e) => setDraft({ ...draft, markups: { ...draft.markups, [g.slug]: e.target.value } })}
                />
                %
              </label>
            ))}
            <div className="pw-actions">
              <button className="pw-btn ok" disabled={busy === "settings"} onClick={saveSettings}>
                Saqlash
              </button>
            </div>
          </div>
        )}

        <div className="pw-line" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={paidOnly} onChange={(e) => setPaidOnly(e.target.checked)} />
            Faqat to'langanlar
          </label>
          <span className="pw-muted">Ro'yxatdagi yetkazilganlar: {fmt(sum)} so'm</span>
        </div>
        {err && <div className="pw-err">{err}</div>}
        {!items.length ? (
          <div className="pw-muted">Hozircha buyurtma yo'q</div>
        ) : (
          items.map((it) => {
            const [label, cls] = STATUS[it.status] || [it.status, "s-waiting"];
            const canResend = it.payment_status === "paid" && ["failed", "error", "processing"].includes(it.status);
            return (
              <div className="pw-card" key={it.id}>
                <div className="pw-card-top">
                  <b>
                    #{it.id} {it.game_slug} · {it.item_name}
                  </b>
                  <span className={`pw-status ${cls}`}>{label}</span>
                </div>
                <div className="pw-line">
                  {it.player_id ? `ID ${it.player_id}${it.player_name ? ` (${it.player_name})` : ""}` : "Havola (gift card)"}
                  {it.contact ? ` · aloqa: ${it.contact}` : ""}
                </div>
                <div className="pw-line">
                  {fmt(it.summ)} so'm · {hhmm(it.created_at)} · {it.site || "—"} · karta *{it.card_last4 || "?"}
                </div>
                <div className="pw-line pw-muted">
                  Tannarx {it.usdt_charged ?? it.usdt_price} USDT · ustama {Number(it.markup_percent)}%
                  {it.provider_order_id ? ` · StarsPaymee #${it.provider_order_id} (${it.provider_status || "?"})` : ""}
                </div>
                {it.error && <div className="pw-line" style={{ color: "#ff8a8a" }}>{it.error}</div>}
                {canResend && (
                  <div className="pw-actions">
                    <button className="pw-btn ok" disabled={busy === it.id} onClick={() => resend(it)}>
                      🔁 Qayta yuborish
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
