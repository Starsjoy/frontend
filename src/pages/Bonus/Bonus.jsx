import { useCallback, useEffect, useRef, useState } from "react";
import apiFetch from "../../utils/apiFetch";
import { useTranslation } from "../../context/LanguageContext";
import BonusView from "./BonusView";

const POLL_MS = 4000;

/** Bonuslar sahifasi — /api/rewards/* bilan */
export default function Bonus() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const pollRef = useRef(null);
  const seenIdsRef = useRef(new Set());
  const dataRef = useRef(null);
  dataRef.current = data;

  // Dashboard'dagi "Bonuslar" belgisini yangilash (Bonuslar shu iframe ichida ochiladi)
  const postUnseen = useCallback((ledger) => {
    const n = (ledger || []).filter((e) => !e.seen && e.delta > 0 && !seenIdsRef.current.has(e.id)).length;
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ channel: "starsjoy-bonus", unseen: n }, window.location.origin);
      }
    } catch {
      /* ota oyna yo'q — e'tiborsiz */
    }
  }, []);

  const username = String(window?.Telegram?.WebApp?.initDataUnsafe?.user?.username || "");

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/rewards/status");
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      setData(json);
      postUnseen(json.ledger);
      setError(false);
    } catch {
      setError(true);
    }
  }, [postUnseen]);

  useEffect(() => {
    load();
  }, [load]);

  // Bonus yuborilayotgan paytda holatni kuzatib turamiz
  useEffect(() => {
    clearInterval(pollRef.current);
    if (data?.active_redemption) pollRef.current = setInterval(load, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [data?.active_redemption, load]);

  const onSeen = useCallback(async (ledgerId) => {
    seenIdsRef.current.add(ledgerId);
    postUnseen(dataRef.current?.ledger);
    try {
      await apiFetch("/api/rewards/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ledger_id: ledgerId }),
      });
    } catch {
      /* keyingi ochilishda qayta ko'rsatiladi — zarari yo'q */
    }
  }, [postUnseen]);

  const onRedeem = useCallback(async (itemId, recipientUsername = "") => {
    try {
      const res = await apiFetch("/api/rewards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, recipient_username: recipientUsername || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      return res.ok ? { ok: true } : { ok: false, code: body.code };
    } catch {
      return { ok: false };
    }
  }, []);

  if (error && !data) {
    return (
      <div className="bv-root">
        <p className="bv-empty">{t("rewards.loadError")}</p>
      </div>
    );
  }
  if (!data) return <div className="bv-root" />;

  return <BonusView data={data} username={username} onRedeem={onRedeem} onSeen={onSeen} onRefresh={load} />;
}
