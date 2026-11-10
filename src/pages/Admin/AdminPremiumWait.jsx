/** @jsxImportSource ./adminJsx */
import { useCallback, useEffect, useState } from "react";
import apiFetch from "../../utils/apiFetch";
import "./AdminPremiumWait.css";

/**
 * Admin → Premium → ⏳ Kutilayotgan Premium.
 * Mijoz to'lagan, lekin ko'rsatgan username'da Premium hali aktiv: tugash kuni 09:00 da
 * egasiga bot orqali eslatma boradi. Bu yerda ro'yxat, qo'lda qo'shish, sana o'zgartirish,
 * Bajarildi / Bekor belgilash. Support AI faqat eslatma yaratadi.
 */

const FILTERS = [
  ["waiting", "Kutilmoqda"],
  ["done", "Bajarildi"],
  ["cancelled", "Bekor"],
  ["", "Hammasi"],
];
const fmt = (n) => Number(n || 0).toLocaleString("ru-RU");
const EMPTY = { recipient_username: "", due_date: "", months: "3", amount: "", order_id: "", note: "" };

function dueLabel(due, today) {
  if (!due || !today) return "";
  const days = Math.round((Date.parse(due) - Date.parse(today)) / 86400000);
  if (days === 0) return "bugun";
  if (days < 0) return `${-days} kun o'tdi`;
  return `${days} kun qoldi`;
}
const ddmm = (iso) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "—");

export default function AdminPremiumWait() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("waiting");
  const [items, setItems] = useState([]);
  const [today, setToday] = useState("");
  const [waitingCount, setWaitingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState(null);
  const [editDate, setEditDate] = useState({});
  const [confirmCancel, setConfirmCancel] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await apiFetch(`/api/admin/premium-wait${filter ? `?status=${filter}` : ""}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xato");
      setItems(data.items || []);
      setToday(data.today || "");
      if (filter === "waiting") setWaitingCount((data.items || []).length);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Sarlavhadagi son uchun yopiq holatda ham bir marta yuklaymiz
  useEffect(() => {
    apiFetch("/api/admin/premium-wait?status=waiting")
      .then((r) => r.json())
      .then((d) => setWaitingCount((d.items || []).length))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function patch(id, body) {
    setErr("");
    try {
      const res = await apiFetch(`/api/admin/premium-wait/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xato");
      setConfirmCancel(null);
      setEditDate((s) => ({ ...s, [id]: undefined }));
      load();
    } catch (e) {
      setErr(e.message);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      const body = { ...form, recipient_username: form.recipient_username.replace(/^@/, "").trim() };
      ["amount", "order_id"].forEach((k) => body[k] === "" && delete body[k]);
      const res = await apiFetch("/api/admin/premium-wait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xato");
      setForm(null);
      setFilter("waiting");
      load();
    } catch (e2) {
      setErr(e2.message);
    }
  }

  return (
    <div className="pw-root">
      <button type="button" className="pw-head" onClick={() => setOpen((v) => !v)}>
        <span>⏳ Kutilayotgan Premium</span>
        <span className="pw-head-right">
          {waitingCount > 0 && <span className="pw-badge">{waitingCount}</span>}
          <span className="pw-chev">{open ? "▴" : "▾"}</span>
        </span>
      </button>

      {open && (
        <div className="pw-body">
          <p className="pw-hint">
            Mijoz to'lagan, lekin username'da Premium hali aktiv. Tugash kuni soat 09:00 da botdan eslatma keladi.
          </p>

          <div className="pw-filters">
            {FILTERS.map(([v, l]) => (
              <button key={v || "all"} type="button" className={`pw-chip ${filter === v ? "on" : ""}`} onClick={() => setFilter(v)}>
                {l}
              </button>
            ))}
            <button type="button" className="pw-add" onClick={() => setForm(form ? null : { ...EMPTY })}>
              {form ? "Yopish" : "+ Qo'shish"}
            </button>
          </div>

          {form && (
            <form className="pw-form" onSubmit={submit}>
              <input placeholder="@username (Premium ulanadigan)" value={form.recipient_username}
                onChange={(e) => setForm({ ...form, recipient_username: e.target.value })} required />
              <label className="pw-label">
                Premium tugash sanasi
                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required />
              </label>
              <div className="pw-row">
                <select value={form.months} onChange={(e) => setForm({ ...form, months: e.target.value })}>
                  <option value="3">3 oy</option>
                  <option value="6">6 oy</option>
                  <option value="12">12 oy</option>
                </select>
                <input inputMode="numeric" placeholder="Summa" value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, "") })} />
                <input inputMode="numeric" placeholder="Buyurtma #" value={form.order_id}
                  onChange={(e) => setForm({ ...form, order_id: e.target.value.replace(/\D/g, "") })} />
              </div>
              <input placeholder="Izoh (ixtiyoriy)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              <button type="submit" className="pw-save">Saqlash</button>
            </form>
          )}

          {err && <div className="pw-err">{err}</div>}
          {loading && <div className="pw-muted">Yuklanmoqda...</div>}
          {!loading && items.length === 0 && <div className="pw-muted">Ro'yxat bo'sh</div>}

          {items.map((w) => {
            const late = w.status === "waiting" && w.due_date <= today;
            return (
              <div key={w.id} className={`pw-card ${late ? "late" : ""} ${w.status !== "waiting" ? "closed" : ""}`}>
                <div className="pw-card-top">
                  <b>@{w.recipient_username}</b>
                  <span className={`pw-status s-${w.status}`}>
                    {w.status === "waiting" ? "Kutilmoqda" : w.status === "done" ? "Bajarildi" : "Bekor"}
                  </span>
                </div>
                <div className="pw-line">
                  📅 {ddmm(w.due_date)}
                  {w.status === "waiting" && <span className="pw-due"> · {dueLabel(w.due_date, today)}</span>}
                  {w.notified_at && <span className="pw-muted"> · eslatildi</span>}
                </div>
                <div className="pw-line">
                  {w.months ? `${w.months} oy` : "—"}
                  {w.amount ? ` · ${fmt(w.amount)} so'm` : ""}
                  {w.order_id ? ` · #${w.order_id}` : ""}
                </div>
                {(w.payer_username || w.payer_user_id) && (
                  <div className="pw-line pw-muted">
                    To'lagan: {w.payer_username ? `@${w.payer_username}` : ""} {w.payer_user_id ? `(ID ${w.payer_user_id})` : ""}
                  </div>
                )}
                {w.note && <div className="pw-line pw-muted">📝 {w.note}</div>}
                <div className="pw-line pw-muted">{w.created_by === "agent" ? "🤖 Support AI qo'shgan" : "👤 Admin qo'shgan"}</div>

                {w.status === "waiting" && (
                  <div className="pw-actions">
                    <button type="button" className="pw-btn ok" onClick={() => patch(w.id, { status: "done" })}>✅ Bajarildi</button>
                    {editDate[w.id] !== undefined ? (
                      <>
                        <input type="date" value={editDate[w.id]} onChange={(e) => setEditDate({ ...editDate, [w.id]: e.target.value })} />
                        <button type="button" className="pw-btn" disabled={!editDate[w.id]}
                          onClick={() => patch(w.id, { due_date: editDate[w.id] })}>Saqlash</button>
                      </>
                    ) : (
                      <button type="button" className="pw-btn" onClick={() => setEditDate({ ...editDate, [w.id]: w.due_date })}>📅 Sana</button>
                    )}
                    {confirmCancel === w.id ? (
                      <button type="button" className="pw-btn no" onClick={() => patch(w.id, { status: "cancelled" })}>Ha, bekor</button>
                    ) : (
                      <button type="button" className="pw-btn no" onClick={() => setConfirmCancel(w.id)}>✖ Bekor</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
