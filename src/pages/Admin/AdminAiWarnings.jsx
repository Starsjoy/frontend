/** @jsxImportSource ./adminJsx */
import { useCallback, useEffect, useState } from "react";
import apiFetch from "../../utils/apiFetch";
import "./AdminPremiumWait.css";

/**
 * Admin → 🤖 AI Warning.
 * Support AI tekshirgan to'lovlar: pul kartaga tushgan, SMS hech kimga bog'lanmagan, chek buyurtmaga mos,
 * lekin summa 3% gacha farq qilgani uchun avtomatik o'tmagan. AI hech narsani tasdiqlamaydi:
 * yuborish faqat shu yerda egasi tugmani bosganda (oddiy admin yuborish oqimi orqali).
 * Buyurtma to'langach ro'yxatdan o'zi yo'qoladi. Tartib: buyurtma ochilgan vaqt bo'yicha.
 */

const fmt = (n) => Number(n || 0).toLocaleString("ru-RU");
const hhmm = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (x) => String(x).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const kind = (t) => (/gift/.test(t || "") ? "gift" : /premium/.test(t || "") ? "premium" : "stars");
const KIND_LABEL = { stars: "⭐ Stars", premium: "💎 Premium", gift: "🎁 Gift" };

export default function AdminAiWarnings({ onSend, onCount }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/admin/ai-warnings");
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "Xato");
      setItems(d.items || []);
      onCount?.(d.items?.length || 0);
      setErr("");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [onCount]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const send = async (it) => {
    setBusy(it.id);
    try {
      await onSend?.(kind(it.order_type), Number(it.order_id), it.status);
    } finally {
      setBusy(null);
      setTimeout(load, 1500);
    }
  };

  const dismiss = async (it) => {
    if (!window.confirm(`#${it.order_id} ni AI Warning ro'yxatidan olib tashlaysizmi? (buyurtma o'zgarmaydi)`)) return;
    setBusy(it.id);
    try {
      await apiFetch(`/api/admin/ai-warnings/${it.id}/dismiss`, { method: "POST" });
    } finally {
      setBusy(null);
      load();
    }
  };

  return (
    <div className="pw-root">
      <div className="pw-head" style={{ cursor: "default" }}>
        <span>🤖 AI Warning</span>
        <span className="pw-head-right">
          <span className="pw-badge">{items.length}</span>
        </span>
      </div>
      <div className="pw-body">
        <p className="pw-hint">
          Pul kartaga tushgan, hech kimga bog'lanmagan, chek mos, lekin summa 3% gacha farq qilgan. AI tasdiqlamaydi,
          yuborish faqat siz bosganda.
        </p>
        {err && <div className="pw-err">{err}</div>}
        {loading ? (
          <div className="pw-muted">Yuklanmoqda…</div>
        ) : !items.length ? (
          <div className="pw-muted">Hozircha yo'q ✅</div>
        ) : (
          items.map((it) => {
            const diff = Number(it.diff);
            return (
              <div className="pw-card" key={it.id}>
                <div className="pw-card-top">
                  <b>
                    #{it.order_id} {KIND_LABEL[kind(it.order_type)]} {it.type_amount}
                  </b>
                  <span className="pw-status s-waiting">{it.status}</span>
                </div>
                <div className="pw-line">
                  Mijoz: @{it.owner_username || "—"} (ID {it.owner_user_id}) → @{String(it.recipient_username || "—").replace(/^@/, "")}
                </div>
                <div className="pw-line">
                  Buyurtma: {fmt(it.order_summ)} so'm, {hhmm(it.created_at)}
                </div>
                <div className="pw-line">
                  To'langan: <b>{fmt(it.sms_amount)}</b> so'm ({diff > 0 ? "+" : ""}
                  {fmt(diff)}), *{it.card_last4}, {hhmm(it.sms_at)}, sms #{it.sms_id}
                </div>
                {it.note && <div className="pw-line pw-muted">{it.note}</div>}
                <div className="pw-actions">
                  <button className="pw-btn ok" disabled={busy === it.id} onClick={() => send(it)}>
                    ✅ Yuborish
                  </button>
                  <button className="pw-btn no" disabled={busy === it.id} onClick={() => dismiss(it)}>
                    Olib tashlash
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
