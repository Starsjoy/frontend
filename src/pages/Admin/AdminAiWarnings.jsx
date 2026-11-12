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
  const [sendState, setSendState] = useState({}); // id -> "sending" | "sent"
  const [sentItems, setSentItems] = useState([]); // yuborilganlar bir oz ko'rinib turadi

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
    if (!window.confirm(`#${it.order_id} ni mijozga yuborasizmi? (${fmt(it.sms_amount)} so'm to'langan)`)) return;
    setBusy(it.id);
    setSendState((s) => ({ ...s, [it.id]: "sending" }));
    try {
      await onSend?.(kind(it.order_type), Number(it.order_id), it.status);
      // Yetkazilguncha kutamiz: buyurtma to'langach ro'yxatdan chiqadi (90 soniyagacha)
      let gone = false;
      let last = null;
      for (let i = 0; i < 45 && !gone; i++) {
        const res = await apiFetch("/api/admin/ai-warnings");
        last = await res.json();
        gone = !(last.items || []).some((x) => x.id === it.id);
        if (!gone) await new Promise((r) => setTimeout(r, 2000));
      }
      if (gone) {
        setSendState((s) => ({ ...s, [it.id]: "sent" }));
        setSentItems((xs) => [...xs, it]);
        setTimeout(() => setSentItems((xs) => xs.filter((x) => x.id !== it.id)), 8000);
      } else {
        setSendState((s) => ({ ...s, [it.id]: undefined }));
        alert(`#${it.order_id} hali yetkazilmadi, buyurtmani tekshiring.`);
      }
      if (last) {
        setItems(last.items || []);
        onCount?.(last.items?.length || 0);
      }
    } catch {
      setSendState((s) => ({ ...s, [it.id]: undefined }));
    } finally {
      setBusy(null);
    }
  };
  const shown = [...items, ...sentItems.filter((x) => !items.some((i) => i.id === x.id))];

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
        ) : !shown.length ? (
          <div className="pw-muted">Hozircha yo'q ✅</div>
        ) : (
          shown.map((it) => {
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
                  {fmt(diff)}), *{it.card_last4}, {hhmm(it.sms_at)}
                  {it.source === "balance" ? "" : `, sms #${it.sms_id}`}
                </div>
                {it.source === "balance" && (
                  <div className="pw-line" style={{ color: "#ffd45c" }}>
                    ⚖️ Balans usuli bilan: SMS kelmagan, to'lov karta qoldig'i bo'yicha aniqlangan. Kartadan tekshirib ko'ring.
                  </div>
                )}
                {it.note && <div className="pw-line pw-muted">{it.note}</div>}
                <div className="pw-actions">
                  <button
                    className="pw-btn ok"
                    disabled={busy === it.id || sendState[it.id] === "sent"}
                    onClick={() => send(it)}
                  >
                    {sendState[it.id] === "sending" ? "⏳ Yuborilyapti…" : sendState[it.id] === "sent" ? "✅ Yuborildi" : "✅ Yuborish"}
                  </button>
                  {sendState[it.id] !== "sent" && (
                    <button className="pw-btn no" disabled={busy === it.id} onClick={() => dismiss(it)}>
                      Olib tashlash
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
