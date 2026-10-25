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

  const username = String(window?.Telegram?.WebApp?.initDataUnsafe?.user?.username || "");

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/rewards/status");
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

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
    try {
      await apiFetch("/api/rewards/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ledger_id: ledgerId }),
      });
    } catch {
      /* keyingi ochilishda qayta ko'rsatiladi — zarari yo'q */
    }
  }, []);

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
