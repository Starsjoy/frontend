import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../../context/LanguageContext";
import apiFetch from "../../utils/apiFetch";
import yurakImg from "../../assets/yurak_new.png";
import ayiqImg from "../../assets/ayiq_new.png";
import "./gift.css";

const CARD_NUMBER = import.meta.env.VITE_CARD_NUMBER;
const CARD_NAME = import.meta.env.VITE_CARD_NAME;

const GIFTS = [
  { id: "5170145012310081615", emoji: "\u{1F49D}", stars: 15 },
  { id: "5170233102089322756", emoji: "\u{1F9F8}", stars: 15 },
  { id: "5170250947678437525", emoji: "\u{1F381}", stars: 25 },
  { id: "5168103777563050263", emoji: "\u{1F339}", stars: 25 },
  { id: "5170144170496491616", emoji: "\u{1F382}", stars: 50 },
  { id: "5170314324215857265", emoji: "\u{1F490}", stars: 50 },
  { id: "5170564780938756245", emoji: "\u{1F680}", stars: 50 },
  { id: "6028601630662853006", emoji: "\u{1F37E}", stars: 50 },
  { id: "5922558454332916696", emoji: "\u{1F384}", stars: 50 },
  { id: "5801108895304779062", emoji: "\u{1F381}", stars: 50, image: yurakImg },
  { id: "5800655655995968830", emoji: "\u{1F381}", stars: 50, image: ayiqImg },
  { id: "5168043875654172773", emoji: "\u{1F3C6}", stars: 100 },
  { id: "5170690322832818290", emoji: "\u{1F48D}", stars: 100 },
  { id: "5170521118301225164", emoji: "\u{1F48E}", stars: 100 },
];

// Narxlar (so'mda)
const PRICE_MAP = { 15: 3500, 25: 5500, 50: 11000, 100: 22000 };
const MAX_COMMENT_LENGTH = 128;

const formatAmount = (num) => Number(num || 0).toLocaleString("ru-RU");
const formatTime = (sec) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

export default function Gift() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Step 1: Recipient
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Step 2: Gift selection
  const [selectedGift, setSelectedGift] = useState(null);

  // Step 3: Options
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [withComment, setWithComment] = useState(false);
  const [comment, setComment] = useState("");

  // Step 4: Payment
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | pending | completed | gift_sent | expired | failed | error
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(1200);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const pollingRef = useRef(null);
  const countdownRef = useRef(null);

  // Telegram username
  const fillMyUsername = () => {
    try {
      const tgUser = window?.Telegram?.WebApp?.initDataUnsafe?.user?.username;
      if (!tgUser) return;
      setUsername(tgUser);
    } catch {}
  };

  // Profile search (debounced)
  useEffect(() => {
    if (!username) {
      setProfile(null);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        setLoadingProfile(true);
        const clean = username.startsWith("@") ? username.slice(1) : username;
        const res = await apiFetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: clean }),
        });
        const data = await res.json();
        if (res.ok) setProfile(data);
        else setProfile(null);
      } catch {
        setProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [username]);

  // Comment switch o'chganda textni tozalash
  useEffect(() => {
    if (!withComment) setComment("");
  }, [withComment]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      stopCountdown();
    };
  }, []);

  // Restore pending order from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pendingGiftOrder");
      if (!saved) return;
      const parsed = JSON.parse(saved);
      const elapsed = Date.now() - new Date(parsed.createdAt).getTime();
      if (elapsed < 20 * 60 * 1000) {
        setOrder(parsed.order);
        setStatus(parsed.status || "pending");
        const remaining = Math.max(0, 1200 - Math.floor(elapsed / 1000));
        setCountdown(remaining);
        startPolling(parsed.order);
        startCountdownTimer(remaining);
        if (parsed.status === "pending") {
          setShowModal(true);
        }
      } else {
        localStorage.removeItem("pendingGiftOrder");
      }
    } catch {}
  }, []);

  // === Polling ===
  const startPolling = (orderData) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/gift/status/${orderData.id}`);
        const data = await res.json();

        if (data.status !== status) {
          setStatus(data.status);
          const saved = localStorage.getItem("pendingGiftOrder");
          if (saved) {
            const p = JSON.parse(saved);
            p.status = data.status;
            localStorage.setItem("pendingGiftOrder", JSON.stringify(p));
          }
        }

        if (data.status === "gift_sent") {
          stopPolling();
          stopCountdown();
          localStorage.removeItem("pendingGiftOrder");
          setShowModal(true);
        }

        if (["expired", "failed", "error"].includes(data.status)) {
          stopPolling();
          stopCountdown();
          localStorage.removeItem("pendingGiftOrder");
        }
      } catch {}
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // === Countdown ===
  const startCountdownTimer = (seconds) => {
    stopCountdown();
    setCountdown(seconds);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          stopCountdown();
          setStatus("expired");
          localStorage.removeItem("pendingGiftOrder");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  // === Create Order ===
  const handleSend = async () => {
    if (!profile || !selectedGift) return;
    setSending(true);
    try {
      const res = await apiFetch("/api/gift/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientUsername: profile.username,
          giftId: selectedGift.id,
          stars: selectedGift.stars,
          anonymous: isAnonymous,
          comment: withComment && comment.trim() ? comment.trim() : undefined,
        }),
      });
      const newOrder = await res.json();

      if (!res.ok) {
        alert(newOrder.error || t("gift.error"));
        setSending(false);
        return;
      }

      setOrder(newOrder);
      setStatus("pending");
      setShowModal(true);

      localStorage.setItem(
        "pendingGiftOrder",
        JSON.stringify({
          order: newOrder,
          createdAt: new Date().toISOString(),
          status: "pending",
        })
      );

      startPolling(newOrder);
      startCountdownTimer(1200);
    } catch {
      alert(t("gift.error"));
    } finally {
      setSending(false);
    }
  };

  // === Copy handlers ===
  const handleCopyCard = () => {
    navigator.clipboard.writeText(CARD_NUMBER);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(String(order?.amount));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // === Reset ===
  const resetAll = () => {
    setOrder(null);
    setStatus("idle");
    setShowModal(false);
    setSelectedGift(null);
    setComment("");
    setWithComment(false);
    stopPolling();
    stopCountdown();
  };

  // Narxi
  const giftPrice = selectedGift ? PRICE_MAP[selectedGift.stars] : 0;

  return (
    <div className="gift-container">
      {/* Back Button */}
      <button className="btn-back-top" onClick={() => navigate("/")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Orqaga
      </button>

      {/* Header */}
      <div className="gift-page-title">
        <h1>{t("gift.title")}</h1>
        <p>{t("gift.subtitle")}</p>
      </div>

      {/* Recipient Search */}
      <div className="gift-search-section">
        <label className="gift-label">{t("gift.selectRecipient")}</label>
        <div className="gift-search-row">
          <input
            className="gift-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@username"
          />
          {window?.Telegram?.WebApp && (
            <button className="gift-my-btn" onClick={fillMyUsername}>
              {t("gift.me")}
            </button>
          )}
        </div>

        {loadingProfile && (
          <div className="gift-loading-dots">
            <span></span><span></span><span></span>
          </div>
        )}

        {profile && (
          <div className="gift-profile-card">
            <img src={profile.imageUrl || ""} alt="" className="gift-profile-img" />
            <div className="gift-profile-info">
              <div className="gift-profile-name">{profile.fullName}</div>
              <div className="gift-profile-username">@{profile.username}</div>
            </div>
          </div>
        )}
      </div>

      {/* Options: Anonymous + Comment — right below recipient */}
      {!showModal && (
        <div className="gift-options-section">
          {/* Anonymous Toggle */}
          <div className="gift-option-row">
            <div className="gift-option-left">
              <span className="gift-option-icon">🕶️</span>
              <div className="gift-option-text">
                <span className="gift-option-title">{t("gift.anonymous")}</span>
                <span className="gift-option-desc">{t("gift.anonymousDesc")}</span>
              </div>
            </div>
            <label className="gift-switch">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />
              <span className="gift-switch-slider"></span>
            </label>
          </div>

          {/* Comment Toggle */}
          <div className="gift-option-row">
            <div className="gift-option-left">
              <span className="gift-option-icon">💬</span>
              <div className="gift-option-text">
                <span className="gift-option-title">{t("gift.addComment")}</span>
                <span className="gift-option-desc">{t("gift.addCommentDesc")}</span>
              </div>
            </div>
            <label className="gift-switch">
              <input
                type="checkbox"
                checked={withComment}
                onChange={(e) => setWithComment(e.target.checked)}
              />
              <span className="gift-switch-slider"></span>
            </label>
          </div>

          {/* Comment Input */}
          {withComment && (
            <div className="gift-comment-section">
              <div className="gift-comment-wrap">
                <textarea
                  className="gift-comment-input"
                  value={comment}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_COMMENT_LENGTH) {
                      setComment(e.target.value);
                    }
                  }}
                  placeholder={t("gift.commentPlaceholder")}
                  rows={3}
                  autoFocus
                />
                <span className="gift-comment-counter">
                  {comment.length}/{MAX_COMMENT_LENGTH}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* All Gifts Grid */}
      <div className="gift-catalog">
        <label className="gift-label">
          <span className="gift-label-icon">🎁</span>
          {t("gift.selectGift")}
        </label>
        <div className="gift-grid-4col">
          {GIFTS.map((gift) => (
            <div
              key={gift.id}
              className={`gift-card ${selectedGift?.id === gift.id ? "selected" : ""}`}
              onClick={() => setSelectedGift(gift)}
            >
              {gift.image ? (
                <img src={gift.image} alt="" className="gift-card-img" />
              ) : (
                <span className="gift-emoji">{gift.emoji}</span>
              )}
              <span className="gift-price-label">{formatAmount(PRICE_MAP[gift.stars])} so'm</span>
            </div>
          ))}
        </div>
      </div>

      {/* Send Button — below gift grid */}
      {!showModal && selectedGift && (
        <div className="gift-actions">
          <button
            className="gift-send-btn"
            onClick={handleSend}
            disabled={sending || !profile || !selectedGift}
          >
            {sending
              ? t("gift.sending")
              : profile && selectedGift
                ? `${t("gift.send")} — ${formatAmount(giftPrice)} so'm`
                : !profile
                  ? "Kimga yubormoqchisiz?"
                  : t("gift.send")}
          </button>
        </div>
      )}

      {/* ============== PAYMENT MODAL ============== */}
      {showModal && (
        <div className="gift-modal-overlay">
          <div className="gift-modal-content">

            {/* PENDING — karta ma'lumotlari */}
            {status === "pending" && (
              <div className="gift-modal-pending">
                <div className="gift-modal-header">
                  <span className="gift-modal-title">{t("gift.paymentTitle")}</span>
                  <button className="gift-modal-close" onClick={() => setShowModal(false)}>✕</button>
                </div>

                {/* Gift preview */}
                <div className="gift-modal-preview">
                  {selectedGift?.image ? (
                    <img src={selectedGift.image} alt="" className="gift-modal-img" />
                  ) : (
                    <span className="gift-modal-emoji">{selectedGift?.emoji || "🎁"}</span>
                  )}
                  <div>
                    <div className="gift-modal-recipient">@{order?.recipient_username}</div>
                    <div className="gift-modal-stars">{order?.stars} ⭐</div>
                  </div>
                </div>

                {/* Payment cards */}
                <div className="gift-modal-pay-grid">
                  <div className="gift-modal-pay-item">
                    <div className="gift-modal-pay-label">{t("stars.cardNumber")}</div>
                    <div className="gift-modal-pay-row">
                      <span className="gift-modal-pay-value">{CARD_NUMBER}</span>
                      <button className="gift-modal-copy-btn" onClick={handleCopyCard}>
                        {copied ? "✓" : "📋"}
                      </button>
                    </div>
                  </div>

                  <div className="gift-modal-pay-item">
                    <div className="gift-modal-pay-label">{t("stars.cardName")}</div>
                    <div className="gift-modal-pay-row">
                      <span className="gift-modal-pay-value">{CARD_NAME}</span>
                    </div>
                  </div>

                  <div className="gift-modal-pay-item highlight">
                    <div className="gift-modal-pay-label">{t("stars.totalAmount")}</div>
                    <div className="gift-modal-pay-row">
                      <span className="gift-modal-pay-value bold">
                        {formatAmount(order?.amount)} so'm
                      </span>
                      <button className="gift-modal-copy-btn" onClick={handleCopyAmount}>
                        {copied ? "✓" : "📋"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="gift-modal-warning">
                  <span>⚠️</span>
                  <span>{t("gift.exactAmount")} <b>{formatAmount(order?.amount)} so'm</b></span>
                </div>

                {/* Timer & spinner */}
                <div className="gift-modal-status-bar">
                  <div className="gift-modal-timer">
                    <span>⏳</span> {formatTime(countdown)}
                  </div>
                  <div className="gift-modal-waiting">
                    <div className="gift-modal-spinner"></div>
                    <span>{t("stars.paymentPending")}</span>
                  </div>
                </div>

                <button className="gift-modal-close-btn" onClick={() => setShowModal(false)}>
                  {t("common.close")}
                </button>
                <p className="gift-modal-hint">{t("gift.modalHint")}</p>
              </div>
            )}

            {/* COMPLETED — gift yuborilmoqda */}
            {status === "completed" && (
              <div className="gift-modal-sending">
                <div className="gift-sending-anim">
                  <div className="gift-pulse-ring"></div>
                  <div className="gift-pulse-ring delay"></div>
                  <div className="gift-sending-icon">🎁</div>
                </div>
                <h3>{t("gift.paymentConfirmed")}</h3>
                <p>{t("gift.giftSending")}</p>
                <div className="gift-sending-bar">
                  <div className="gift-sending-bar-fill"></div>
                </div>
              </div>
            )}

            {/* GIFT_SENT — muvaffaqiyat */}
            {status === "gift_sent" && (
              <div className="gift-modal-success">
                <div className="gift-success-icon">✅</div>
                <h3>{t("gift.success")}</h3>
                <p className="gift-success-detail">
                  {selectedGift?.emoji} → @{order?.recipient_username}
                </p>
                <button className="gift-modal-action-btn" onClick={resetAll}>
                  {t("gift.sendAnother")}
                </button>
              </div>
            )}

            {/* EXPIRED / FAILED */}
            {["expired", "failed", "error"].includes(status) && (
              <div className="gift-modal-error">
                <div className="gift-error-icon">❌</div>
                <h3>
                  {status === "expired" ? t("stars.expired") : t("gift.error")}
                </h3>
                <button className="gift-modal-action-btn" onClick={resetAll}>
                  {t("gift.tryAgain")}
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
