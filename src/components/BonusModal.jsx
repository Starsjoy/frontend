import React, { useCallback, useEffect, useRef, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { useTranslation } from "../context/LanguageContext";
import apiFetch from "../utils/apiFetch";
import { TGSSticker } from "./TGSSticker";
import "./BonusModal.css";

/** Vite dinamik asset: har gift_id uchun src/assets/<gift_id>.tgs kerak */
const stickerUrl = (giftId) => new URL(`../assets/${giftId}.tgs`, import.meta.url).href;

const two = (n) => String(n).padStart(2, "0");
function formatRemain(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${two(Math.floor(s / 3600))}:${two(Math.floor((s % 3600) / 60))}:${two(s % 60)}`;
}

const haptic = (type) => {
  try {
    WebApp?.HapticFeedback?.notificationOccurred?.(type);
  } catch {
    /* Telegram tashqarisida ishlamaydi */
  }
};

export default function BonusModal({ open, onClose }) {
  const { t } = useTranslation();

  const [data, setData] = useState(null);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  // { key } — tarjima kaliti, { text } — serverdan kelgan tayyor matn
  const [error, setError] = useState(null);
  const [needUsername, setNeedUsername] = useState(false);
  const [referralLink, setReferralLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [nowTs, setNowTs] = useState(Date.now());

  // Countdown 0 ga yetganda faqat BIR marta qayta yuklash uchun
  const reloadedRef = useRef(false);
  // Aktiv missiyaga faqat modal ochilganda o'tamiz, har yuklashda emas —
  // aks holda user boshqa missiyani ko'ra olmaydi (indeks qaytib ketadi).
  const focusActiveRef = useRef(true);

  // ⚠️ Bu useCallback BO'SH dep massivi bilan bo'lishi SHART.
  // `t` har renderda yangi funksiya bo'lgani uchun uni dep qilsak,
  // load() identifikatori o'zgarib, quyidagi effekt cheksiz qayta ishlaydi.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/bonus/status");
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || "status error");

      setData(d);
      reloadedRef.current = false;
      if (d.all_claimed) localStorage.setItem("spmAllMissionsDone", "1");

      if (focusActiveRef.current) {
        focusActiveRef.current = false;
        // Aktiv missiyaga o'tamiz (hammasi olingan bo'lsa — oxirgisi)
        const activeIdx = d.active_level
          ? d.missions.findIndex((m) => m.level === d.active_level)
          : d.missions.length - 1;
        setIdx(activeIdx >= 0 ? activeIdx : 0);
      }
    } catch (err) {
      console.error("bonus status error:", err);
      setError({ key: "bonus.loadError" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    focusActiveRef.current = true;
    load();

    const userId = WebApp?.initDataUnsafe?.user?.id || localStorage.getItem("userId");
    if (!userId) return;
    apiFetch(`/api/referral/link/${userId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.referral_link && setReferralLink(d.referral_link))
      .catch(() => {});
  }, [open, load]);

  const mission = data?.missions?.[idx] || null;
  const waiting = !!mission?.waiting;

  // Kutish rejimida har soniya countdown yangilanadi
  useEffect(() => {
    if (!open || !waiting) return;
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [open, waiting]);

  const remainMs = mission?.verify_at ? new Date(mission.verify_at).getTime() - nowTs : 0;

  useEffect(() => {
    if (waiting && remainMs <= 0 && !reloadedRef.current) {
      reloadedRef.current = true;
      load(); // timer tugadi — backend endi can_claim beradi
    }
  }, [waiting, remainMs, load]);

  if (!open) return null;

  const total = data?.missions?.length || 0;
  const go = (next) => {
    if (next < 0 || next >= total) return;
    setIdx(next);
    setError(null);
  };

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard?.writeText(referralLink);
    setCopied(true);
    haptic("success");
    setTimeout(() => setCopied(false), 2000);
  };

  const share = () => {
    if (!referralLink) return;
    const text = `${t("bonus.shareText")}\n\n${referralLink}`;
    WebApp.openTelegramLink(
      `https://t.me/share/url?url=${encodeURIComponent(" ")}&text=${encodeURIComponent(text)}`
    );
  };

  const claim = async () => {
    // Gift username'ga yuboriladi — API'ga bormasdan oldin lokal tekshiramiz
    if (!WebApp?.initDataUnsafe?.user?.username) {
      setNeedUsername(true);
      return;
    }
    setClaiming(true);
    setError(null);
    try {
      const res = await apiFetch("/api/bonus/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: mission.level }),
      });
      const d = await res.json();

      if (!res.ok) {
        haptic("error");
        // Avval holatni yangilaymiz (load() setError(null) qiladi),
        // keyin xatoni ko'rsatamiz — aks holda xabar darhol o'chib ketardi.
        await load();
        if (d.need_username) setNeedUsername(true);
        else setError(d.error ? { text: d.error } : { key: "bonus.claimError" });
        return;
      }
      haptic("success");
      await load();
    } catch (err) {
      console.error("claim error:", err);
      setError({ key: "bonus.claimError" });
    } finally {
      setClaiming(false);
    }
  };

  const errorMsg = error ? (error.key ? t(error.key) : error.text) : null;

  const badge = mission?.claimed ? "done" : mission?.locked ? "locked" : waiting ? "waiting" : null;

  return (
    <div className="bonus-overlay" onClick={onClose}>
      <div className="bonus-modal" onClick={(e) => e.stopPropagation()}>
        <button className="bonus-close" onClick={onClose} aria-label="close">×</button>

        {loading && !data ? (
          <div className="bonus-loading">{t("bonus.loading")}</div>
        ) : !mission ? (
          <div className="bonus-loading">{errorMsg || t("bonus.loadError")}</div>
        ) : (
          <>
            {/* ---- Sarlavha + dots (o'qlar pastda) ---- */}
            <div className="bonus-nav">
              <span className="bonus-nav-title">
                {t("bonus.mission")} {mission.level}
              </span>
              <div className="bonus-dots">
                {data.missions.map((m, i) => (
                  <button
                    key={m.level}
                    type="button"
                    aria-label={`${t("bonus.mission")} ${m.level}`}
                    className={`bonus-dot ${i === idx ? "active" : ""} ${m.claimed ? "done" : ""}`}
                    onClick={() => go(i)}
                  />
                ))}
              </div>
            </div>

            {/* ---- Sovg'a stikeri ---- */}
            <div className="bonus-sticker-wrap">
              <div className={`bonus-sticker ${mission.locked ? "locked" : ""}`}>
                <TGSSticker
                  key={mission.gift_id}
                  stickerPath={stickerUrl(mission.gift_id)}
                  className="bonus-sticker-inner"
                  autoplay={!mission.locked}
                  loop
                />
              </div>
              {badge && <span className={`bonus-badge ${badge}`}>{badge === "done" ? "✓" : badge === "locked" ? "🔒" : "⏳"}</span>}
            </div>

            {/* ---- Sarlavha + hisoblagich ---- */}
            <div className="bonus-head">
              <h3 className="bonus-title">
                {t("bonus.needFriends").replace("{n}", mission.required)}
              </h3>
              <span className="bonus-counter">
                {mission.progress}/{mission.required}
              </span>
            </div>

            {/* ---- Progress ---- */}
            <div className="bonus-progress">
              <div
                className="bonus-progress-fill"
                style={{ width: `${(mission.progress / mission.required) * 100}%` }}
              />
            </div>

            {/* ---- Holatga qarab bitta blok ----
                 min-height CSS'da: missiyalar almashganda modal balandligi
                 o'zgarib, oyna sakrab ketmasligi uchun. */}
            <div className="bonus-state">
              {needUsername ? (
                <div className="bonus-warn">
                  <span className="bonus-warn-icon">@</span>
                  <p>{t("bonus.needUsername")}</p>
                  <button className="bonus-btn ghost" onClick={() => setNeedUsername(false)}>
                    {t("bonus.gotIt")}
                  </button>
                </div>
              ) : mission.locked ? (
                <div className="bonus-locked">
                  🔒 {t("bonus.lockedNote").replace("{n}", mission.level - 1)}
                </div>
              ) : mission.claimed ? (
                <div className="bonus-claimed">
                  <div className="bonus-claimed-emoji">🎉</div>
                  <p>{t("bonus.claimedMsg")}</p>
                </div>
              ) : waiting ? (
                <div className="bonus-waiting">
                  <div className="bonus-countdown">{formatRemain(remainMs)}</div>
                  <p className="bonus-wait-note">{t("bonus.waitNote")}</p>
                </div>
              ) : mission.can_claim ? (
                <button className="bonus-btn claim" onClick={claim} disabled={claiming}>
                  {claiming ? t("bonus.sending") : `${t("bonus.claim")} 🎁`}
                </button>
              ) : (
                <div className="bonus-invite">
                  {mission.friends_left && (
                    <div className="bonus-left-note">⚠️ {t("bonus.friendsLeft")}</div>
                  )}
                  <div className="bonus-link-row">
                    <span className="bonus-link-text">{referralLink || "..."}</span>
                    <button className="bonus-copy" onClick={copyLink} aria-label="copy">
                      {copied ? "✅" : "📋"}
                    </button>
                  </div>
                  <button className="bonus-btn share" onClick={share}>
                    {t("bonus.inviteFriends")}
                  </button>
                  <p className="bonus-channel-note">{t("bonus.channelMini")}</p>
                </div>
              )}
            </div>

            {errorMsg && <div className="bonus-error">{errorMsg}</div>}

            {/* ---- Missiyalar orasida o'tish (pastda) ---- */}
            <div className="bonus-foot-nav">
              <button
                className="bonus-nav-arrow"
                onClick={() => go(idx - 1)}
                disabled={idx === 0}
                aria-label="prev"
              >
                ‹
              </button>
              <span className="bonus-nav-pos">
                {idx + 1} / {total}
              </span>
              <button
                className="bonus-nav-arrow"
                onClick={() => go(idx + 1)}
                disabled={idx === total - 1}
                aria-label="next"
              >
                ›
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
