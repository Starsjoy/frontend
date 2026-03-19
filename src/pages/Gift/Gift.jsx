import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../../context/LanguageContext";
import apiFetch from "../../utils/apiFetch";
import { TGSSticker } from "../../components/TGSSticker";
import WebApp from "@twa-dev/sdk";
import starsjoyLogo from "../../assets/starsjoy.jpg";
import "./gift.css";

const CARD_NUMBER = import.meta.env.VITE_CARD_NUMBER;
const CARD_NAME = import.meta.env.VITE_CARD_NAME;

// Gift IDlar - har bir gift fayl nomi gift ID ga mos keladi (masalan: 5170145012310081615.tgs)
const GIFTS = [
  { id: "5170145012310081615", stars: 15 },
  { id: "5170233102089322756", stars: 15 },
  { id: "5170250947678437525", stars: 25 },
  { id: "5168103777563050263", stars: 25 },
  { id: "5170144170496491616", stars: 50 },
  { id: "5170314324215857265", stars: 50 },
  { id: "5170564780938756245", stars: 50 },
  { id: "6028601630662853006", stars: 50 },
  { id: "5922558454332916696", stars: 50 },
  { id: "5801108895304779062", stars: 50 },
  { id: "5800655655995968830", stars: 50 },
  { id: "5866352046986232958", stars: 50 },
  { id: "5956217000635139069", stars: 50 },
  { id: "5893356958802511476", stars: 50 },
  { id: "5168043875654172773", stars: 100 },
  { id: "5170690322832818290", stars: 100 },
  { id: "5170521118301225164", stars: 100 },
];

// Gift ID dan TGS sticker path olish
const getGiftStickerPath = (giftId) => {
  return new URL(`../../assets/${giftId}.tgs`, import.meta.url).href;
};

// Narxlar (so'mda) - Backend bilan sinxronlashtirilgan
const PRICE_MAP = { 15: 4000, 25: 6000, 50: 12000, 100: 24000 };
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
  const [hoveredGift, setHoveredGift] = useState(null);
  const [showGiftModal, setShowGiftModal] = useState(false); // Bottom sheet modal

  // Step 3: Options
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [comment, setComment] = useState("");

  // Step 4: Payment
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | payment_info | pending | completed | gift_sent | expired | failed | error
  const [showModal, setShowModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [countdown, setCountdown] = useState(300);
  const [copiedCard, setCopiedCard] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [sending, setSending] = useState(false);

  // Promocode
  const [pramacod, setPramacod] = useState("");
  const [promoMessage, setPromoMessage] = useState("");
  const [promoError, setPromoError] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState(null);

  const pollingRef = useRef(null);
  const countdownRef = useRef(null);

  // Telegram Mini App Back Button
  useEffect(() => {
    try {
      WebApp.BackButton.show();
      const handleBackClick = () => navigate("/");
      WebApp.BackButton.onClick(handleBackClick);
      
      return () => {
        WebApp.BackButton.offClick(handleBackClick);
        WebApp.BackButton.hide();
      };
    } catch (err) {
      console.error("BackButton error:", err);
    }
  }, [navigate]);

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

  // Gift tanlanganda modal ochish
  const handleGiftSelect = (gift) => {
    setSelectedGift(gift);
    // Modal yopilganda yoki yangi tanlanganda promoni tozalash
    setAppliedPromo(null);
    setPromoMessage("");
    setShowGiftModal(true);
  };

  // Modal yopilganda
  const handleCloseGiftModal = () => {
    setShowGiftModal(false);
  };

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
      if (elapsed < 5 * 60 * 1000) {
        setOrder(parsed.order);
        setStatus(parsed.status || "payment_info");
        const remaining = Math.max(0, 300 - Math.floor(elapsed / 1000));
        setCountdown(remaining);
        startPolling(parsed.order);
        startCountdownTimer(remaining);
        if (parsed.status === "pending" || parsed.status === "payment_info") {
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

  // Check Promo
  const handleCheckPromo = async () => {
    if (!pramacod) return;
    setPromoMessage("");
    if (!selectedGift) return;

    try {
      const res = await apiFetch("/api/promocode/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: pramacod,
          type: "gift",
          amount: selectedGift.stars,
          price: PRICE_MAP[selectedGift.stars],
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPromoError(false);
        setPromoMessage(data.message);
        setAppliedPromo({ code: pramacod, newPrice: data.new_price });
      } else {
        setPromoError(true);
        setPromoMessage(data.error);
        setAppliedPromo(null);
      }
    } catch (err) {
      setPromoError(true);
      setPromoMessage("Xatolik yuz berdi");
      setAppliedPromo(null);
    }
  };

  // === Create Order ===
  const handleSend = async () => {
    if (!profile || !selectedGift) return;
    setSending(true);
    try {
      const payload = {
        recipientUsername: profile.username,
        giftId: selectedGift.id,
        stars: selectedGift.stars,
        anonymous: isAnonymous,
        comment: comment.trim() || undefined,
      };
      if (appliedPromo) {
        payload.applied_promocode = appliedPromo.code;
      }

      const res = await apiFetch("/api/gift/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const newOrder = await res.json();

      if (!res.ok) {
        if (newOrder.code === "SLOTS_FULL") {
          alert(t("gift.slotsFull") || "Hozirda barcha slotlar band. Iltimos, bir necha soniyadan so'ng qayta urinib ko'ring!");
        } else {
          alert(newOrder.error || t("gift.error"));
        }
        setSending(false);
        return;
      }

      setOrder(newOrder);
      setStatus("payment_info");
      setShowGiftModal(false); // Bottom sheet yopish
      setShowWarningModal(true);

      localStorage.setItem(
        "pendingGiftOrder",
        JSON.stringify({
          order: newOrder,
          createdAt: new Date().toISOString(),
          status: "payment_info",
        })
      );

      startPolling(newOrder);
      startCountdownTimer(300); // 5 daqiqa
    } catch {
      alert(t("gift.error"));
    } finally {
      setSending(false);
    }
  };

  // === "Tushundim" tugmasi - warning modaldan payment modalga o'tish ===
  const handleWarningUnderstood = () => {
    setShowWarningModal(false);
    setShowModal(true);
  };

  // === "To'lov qildim" tugmasi ===
  const handlePaymentDone = () => {
    setStatus("pending");
    const saved = localStorage.getItem("pendingGiftOrder");
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.status = "pending";
      localStorage.setItem("pendingGiftOrder", JSON.stringify(parsed));
    }
  };

  // === Copy handlers ===
  const handleCopyCard = () => {
    navigator.clipboard.writeText(CARD_NUMBER);
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 1500);
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(String(order?.amount));
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 1500);
  };

  // === Reset ===
  const resetAll = () => {
    setOrder(null);
    setStatus("idle");
    setShowModal(false);
    setShowGiftModal(false);
    setSelectedGift(null);
    setComment("");
    setIsAnonymous(false);
    stopPolling();
    stopCountdown();
  };

  // Narxi
  const giftPrice = selectedGift ? PRICE_MAP[selectedGift.stars] : 0;

  return (
    <div className="gift-container">
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
              onClick={() => handleGiftSelect(gift)}
              onMouseEnter={() => setHoveredGift(gift.id)}
              onMouseLeave={() => setHoveredGift(null)}
              onTouchStart={() => setHoveredGift(gift.id)}
              onTouchEnd={() => setTimeout(() => setHoveredGift(null), 500)}
            >
              <TGSSticker
                stickerPath={getGiftStickerPath(gift.id)}
                className="gift-tgs-sticker"
                autoplay={hoveredGift === gift.id || selectedGift?.id === gift.id}
                loop={true}
              />
              <span className="gift-price-label">{formatAmount(PRICE_MAP[gift.stars])} so'm</span>
            </div>
          ))}
        </div>
      </div>

      {/* ============== GIFT SELECTION BOTTOM SHEET MODAL ============== */}
      {showGiftModal && selectedGift && (
        <div className="gift-bottom-sheet-overlay" onClick={handleCloseGiftModal}>
          {/* 10% top area - Close button */}
          <div className="gift-bs-top-close-area" onClick={handleCloseGiftModal}>
            <button className="gift-bs-top-close-btn" onClick={handleCloseGiftModal}>✕</button>
          </div>
          
          {/* 90% modal area */}
          <div className="gift-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            {/* Drag Handle */}
            <div className="gift-bottom-sheet-handle"></div>
            
            {/* Recipient Label + Input */}
            <label className="gift-bs-recipient-label">Kimga yuboramiz</label>
            <div className="gift-bs-header">
              {profile ? (
                <div className="gift-bs-recipient-found">
                  <img src={profile.imageUrl || ""} alt="" className="gift-bs-avatar" />
                  <div className="gift-bs-user-info">
                    <span className="gift-bs-name">{profile.fullName}</span>
                    <span className="gift-bs-username">@{profile.username}</span>
                  </div>
                  <button 
                    className="gift-bs-clear-btn" 
                    onClick={() => { setUsername(""); setProfile(null); }}
                  >✕</button>
                </div>
              ) : (
                <div className="gift-bs-recipient-input-row">
                  <div className="gift-bs-input-wrap">
                    <span className="gift-bs-input-prefix">@</span>
                    <input
                      type="text"
                      className="gift-bs-username-input"
                      placeholder="username kiriting"
                      value={username.replace('@', '')}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete="off"
                    />
                    {loadingProfile && <span className="gift-bs-input-loader">⏳</span>}
                  </div>
                  {window?.Telegram?.WebApp?.initDataUnsafe?.user?.username && (
                    <button 
                      className="gift-bs-self-btn"
                      onClick={() => setUsername(window.Telegram.WebApp.initDataUnsafe.user.username)}
                    >
                      O'zimga
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Title */}
            <h2 className="gift-bs-title">Hadya yuborish</h2>

            {/* Gift Preview Card */}
            <div className="gift-bs-preview-card">
              <p className="gift-bs-preview-text">
                Starsjoy Official sizga {selectedGift.stars} yulduz miqdorida hadya yubordi
              </p>
              
              <div className="gift-bs-sticker-wrap">
                <TGSSticker
                  stickerPath={getGiftStickerPath(selectedGift.id)}
                  className="gift-bs-sticker"
                  autoplay={true}
                  loop={true}
                />
              </div>
              
              <div className="gift-bs-sender-row">
                <span className="gift-bs-sender-label">Hadya yuboruvchi:</span>
                <img src={starsjoyLogo} alt="" className="gift-bs-sender-avatar" />
                <span className="gift-bs-sender-name">
                  {isAnonymous ? "Anonim" : "Starsjoy Official"}
                </span>
              </div>
              {comment && (
                <p className="gift-bs-message-preview">{comment}</p>
              )}
              <p className="gift-bs-hint">Bu hadyani profilingizga qo'shishingiz mumkin.</p>
              
              <button type="button" className="gift-bs-view-btn">Ko'rish</button>
            </div>

            {/* Message Input */}
            <div className="gift-bs-input-section">
              <input
                type="text"
                className="gift-bs-message-input"
                placeholder="Xabar kiriting"
                value={comment}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_COMMENT_LENGTH) {
                    setComment(e.target.value);
                  }
                }}
              />
              <span className="gift-bs-emoji-btn">😊</span>
            </div>

            {/* Anonymous Toggle */}
            <div className="gift-bs-toggle-row">
              <div className="gift-bs-toggle-info">
                <span className="gift-bs-toggle-title">Anonim yuborish</span>
              </div>
              <label className="gift-bs-switch">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
                <span className="gift-bs-switch-slider"></span>
              </label>
            </div>

            <div className="pramacod" style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '15px 0' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  value={pramacod}
                  onChange={(e) => setPramacod(e.target.value)}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px' }}
                  placeholder="Pramacod (Agar bo'lsa)" 
                />
                <button 
                  type="button" 
                  onClick={handleCheckPromo}
                  style={{ padding: '0 16px', borderRadius: '10px', background: '#e58f0d', color: '#fff', border: 'none', fontWeight: 'bold' }}
                >
                  Tekshirish
                </button>
              </div>
              {promoMessage && (
                <div style={{ fontSize: '13px', color: promoError ? '#ff4d4d' : '#00e676', textAlign: 'left', paddingLeft: '5px' }}>
                  {promoMessage}
                </div>
              )}
            </div>

            {/* Send Button - at bottom */}
            <div className="gift-bs-bottom-area">
              <button
                className={\`gift-bs-send-btn \${!profile ? 'no-recipient' : ''}\`}
                onClick={handleSend}
                disabled={sending || !profile}
              >
                {sending ? (
                  "Yuborilmoqda..."
                ) : !profile ? (
                  "Kimga yuboramiz?"
                ) : (
                  <>{formatAmount(appliedPromo ? appliedPromo.newPrice : PRICE_MAP[selectedGift.stars])} so'm · Hadya yuborish</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============== WARNING MODAL ============== */}
      {showWarningModal && (
        <div className="gift-modal-overlay">
          <div className="gift-modal-content gift-warning-modal">
            <div className="gift-warning-header">
              <h3 className="gift-warning-title">Diqqat</h3>
            </div>
            
            <div className="gift-warning-body">
              <p className="gift-warning-message">
                Kartaga bot ko'rsatgan summani aynan o'sha miqdorda yuboring.
              </p>
              
              <p className="gift-warning-message-sub">
                Summadagi 1 so'mlik farq ham to'lovni aniqlashga xalaqit beradi.
              </p>
              
              <div className="gift-warning-amount-highlight">
                <span className="gift-warning-label">To'lov summasi</span>
                <span className="gift-warning-amount">{formatAmount(order?.amount)} so'm</span>
              </div>
            </div>
            
            <button type="button" className="gift-warning-btn" onClick={handleWarningUnderstood}>
              ✅ Tushundim
            </button>
          </div>
        </div>
      )}

      {/* ============== PAYMENT MODAL ============== */}
      {showModal && (
        <div className="gift-modal-overlay">
          <div className="gift-modal-content">

            {/* PAYMENT_INFO — karta ma'lumotlari va "To'lov qildim" tugmasi */}
            {status === "payment_info" && (
              <div className="gift-modal-pending">
                <div className="gift-modal-header">
                  <span className="gift-modal-title">💳 {t("gift.paymentTitle")}</span>
                  <button type="button" className="gift-modal-close" onClick={() => setShowModal(false)}>✕</button>
                </div>

                {/* Gift preview */}
                <div className="gift-modal-preview">
                  <TGSSticker
                    stickerPath={getGiftStickerPath(selectedGift?.id)}
                    className="gift-modal-tgs"
                    autoplay={true}
                  />
                  <div>
                    <div className="gift-modal-recipient">{t("gift.recipient")}: @{order?.recipient_username}</div>
                    <div className="gift-modal-stars">{order?.stars} ⭐</div>
                  </div>
                </div>

                {/* Payment cards */}
                <div className="gift-modal-pay-grid">
                  <div className="gift-modal-pay-item">
                    <div className="gift-modal-pay-label">{t("stars.cardNumber")}</div>
                    <div className="gift-modal-pay-row">
                      <span className="gift-modal-pay-value">{CARD_NUMBER}</span>
                      <button type="button" className="gift-modal-copy-btn" onClick={handleCopyCard}>
                        {copiedCard ? "✓" : "📋"}
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
                      <button type="button" className="gift-modal-copy-btn" onClick={handleCopyAmount}>
                        {copiedAmount ? "✓" : "📋"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="gift-modal-warning">
                  <span>⚠️</span>
                  <span>{t("gift.exactAmount")} <b>{formatAmount(order?.amount)} so'm</b></span>
                </div>

                {/* Timer */}
                <div className="gift-modal-status-bar">
                  <div className="gift-modal-timer">
                    <span>⏳</span> {formatTime(countdown)}
                  </div>
                </div>

                {/* To'lov qildim button */}
                <button type="button" className="gift-modal-action-btn payment-done" onClick={handlePaymentDone}>
                  ✅ {t("gift.iConfirmPayment")}
                </button>
                <p className="gift-modal-hint">{t("gift.paymentHint")}</p>
              </div>
            )}

            {/* PENDING — To'lov kutilmoqda */}
            {status === "pending" && (
              <div className="gift-modal-pending">
                <div className="gift-modal-header">
                  <span className="gift-modal-title">⏳ {t("gift.paymentSearching")}</span>
                  <button type="button" className="gift-modal-close" onClick={() => setShowModal(false)}>✕</button>
                </div>

                {/* Gift preview */}
                <div className="gift-modal-preview">
                  <TGSSticker
                    stickerPath={getGiftStickerPath(selectedGift?.id)}
                    className="gift-modal-tgs"
                    autoplay={true}
                  />
                  <div>
                    <div className="gift-modal-recipient">{t("gift.recipient")}: @{order?.recipient_username}</div>
                    <div className="gift-modal-stars">{order?.stars} ⭐</div>
                  </div>
                </div>

                {/* Payment info - karta va summa */}
                <div className="gift-modal-pay-grid compact">
                  <div className="gift-modal-pay-item">
                    <div className="gift-modal-pay-label">{t("stars.cardNumber")}</div>
                    <div className="gift-modal-pay-row">
                      <span className="gift-modal-pay-value">{CARD_NUMBER}</span>
                      <button type="button" className="gift-modal-copy-btn" onClick={handleCopyCard}>
                        {copiedCard ? "✓" : "📋"}
                      </button>
                    </div>
                  </div>

                  <div className="gift-modal-pay-item highlight">
                    <div className="gift-modal-pay-label">{t("stars.totalAmount")}</div>
                    <div className="gift-modal-pay-row">
                      <span className="gift-modal-pay-value bold">
                        {formatAmount(order?.amount)} so'm
                      </span>
                      <button type="button" className="gift-modal-copy-btn" onClick={handleCopyAmount}>
                        {copiedAmount ? "✓" : "📋"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Searching animation */}
                <div className="gift-modal-searching">
                  <div className="gift-modal-spinner"></div>
                  <h3>{t("gift.paymentSearching")}</h3>
                  <p>{t("gift.paymentAutoDetect")}</p>
                </div>

                {/* Timer */}
                <div className="gift-modal-status-bar">
                  <div className="gift-modal-timer">
                    <span>⏳</span> {formatTime(countdown)}
                  </div>
                </div>

                <button type="button" className="gift-modal-close-btn" onClick={() => setShowModal(false)}>
                  {t("common.close")}
                </button>
                <p className="gift-modal-hint">{t("gift.modalHint")}</p>
              </div>
            )}

            {/* COMPLETED — gift yuborilmoqda */}
            {status === "completed" && (
              <div className="gift-modal-sending">
                <TGSSticker
                  stickerPath={getGiftStickerPath(selectedGift?.id)}
                  className="gift-modal-tgs-large"
                  autoplay={true}
                />
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
                <TGSSticker
                  stickerPath={getGiftStickerPath(selectedGift?.id)}
                  className="gift-modal-tgs-large"
                  autoplay={true}
                />
                <h3>✅ {t("gift.giftDelivered")}</h3>
                <p className="gift-success-detail">
                  → @{order?.recipient_username}
                </p>
                <button type="button" className="gift-modal-action-btn" onClick={resetAll}>
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
                <button type="button" className="gift-modal-action-btn" onClick={resetAll}>
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
