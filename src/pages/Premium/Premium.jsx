import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Premium.css";
import diamondGif from "../../assets/diamond.gif";
import premiumGif from "../../assets/premium_gif.gif";
import premiumSticker from "../../assets/AnimatedSticker_premium.tgs";
import { TGSSticker } from "../../components/TGSSticker";
import apiFetch from "../../utils/apiFetch";
export default function Premium() {
  const navigate = useNavigate();
  const PREMIUM_3 = parseInt(import.meta.env.VITE_PREMIUM_3);
  const PREMIUM_6 = parseInt(import.meta.env.VITE_PREMIUM_6);
  const PREMIUM_12 = parseInt(import.meta.env.VITE_PREMIUM_12);
  const CARD_NUMBER = import.meta.env.VITE_CARD_NUMBER;
  const CARD_NAME = import.meta.env.VITE_CARD_NAME;

  // ====================
  // STATE
  // ====================
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const plans = [
    { id: 1, label: "3 oy", price: PREMIUM_3, months: 3 },
    { id: 2, label: "6 oy", price: PREMIUM_6, months: 6 },
    { id: 3, label: "1 yil", price: PREMIUM_12, months: 12 },
  ];

  const [selectedPlan, setSelectedPlan] = useState(plans[0]);
  const [order, setOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [cardLast4, setCardLast4] = useState("");

  const countdownRef = useRef(null);
  const pollingRef = useRef(null);
  const [countdown, setCountdown] = useState(0);

  const [loadingBuy, setLoadingBuy] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  // Format
  const formatAmount = (num) =>
    num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  // ================================
  // 🔍 PREMIUM SEARCH
  // ================================
  useEffect(() => {
    if (!username) {
      setProfile(null);
      setSearchError(null);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        setLoadingProfile(true);

        const clean = username.replace("@", "");

        //const res = await fetch("http://localhost:5000/api/premium/search", {
        const res = await apiFetch("/api/premium/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: clean,                // ✔ TO‘G‘RI
            months: selectedPlan.months     // ✔ OPTIONAL
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setProfile(null);
          setSearchError(data.error || "Foydalanuvchi topilmadi");
          return;
        }

        setProfile({
          username: data.username,
          fullName: data.fullName,
          imageUrl: data.imageUrl,
          recipient: data.recipient, // ✔ BACKENDDAN KELGAN ID
        });

        setSearchError(null);
      } catch {
        setSearchError("Tarmoq xatosi");
        setProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    }, 500);

    return () => clearTimeout(delay);
  }, [username, selectedPlan]);

  // 🔹 Telegramdan username olish
  const fillMyUsername = () => {
    try {
      const tgUser =
        window?.Telegram?.WebApp?.initDataUnsafe?.user?.username;

      if (!tgUser) {
        alert("Telegram username topilmadi");
        return;
      }

      setUsername(tgUser);
    } catch (err) {
      console.error("Telegram username olishda xato:", err);
    }
  };

  // ================================
  // 🧾 ORDER YARATISH
  // ================================
  const handleCreateOrder = async () => {

    if (!profile?.username || !profile?.recipient) {
      alert("Foydalanuvchi topilmadi!");
      return;
    }

    setLoadingBuy(true);

    try {
      //const res = await fetch("http://localhost:5000/api/premium", {
      const res = await apiFetch("/api/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: profile.username,
          recipient: profile.recipient, // ✔ ID
          months: selectedPlan.months,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // SLOTS_FULL xatosi
        if (data.code === "SLOTS_FULL") {
          alert("⏳ Hozirda juda ko'p buyurtmalar mavjud.\n\nIltimos, 1-2 daqiqadan keyin qayta urinib ko'ring.");
          return;
        }
        alert(data.error || "Order yaratishda xato");
        return;
      }

      setOrder(data.order);
      setShowWarningModal(true);
      setPaymentStatus("payment_info");
      setCardLast4("");

      startCountdown(300); // 5 daqiqa
      startPolling(data.order.id);

    } catch {
      alert("Server xatosi");
    } finally {
      setLoadingBuy(false);
    }
  };

  // ================================
  // 📡 POLLING
  // ================================
  const startPolling = (id) => {
    stopPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/premium/transactions/${id}`);
        const data = await res.json();

        if (!res.ok) return;

        setPaymentStatus(data.status);
        setCardLast4(data.card_last4 || "");

        // Premium yuborildi - muvaffaqiyatli
        if (data.status === "premium_sent") {
          stopPolling();
          stopCountdown();
          // Auto-yopish timer
          setTimeout(() => setShowModal(false), 15000);
        }

        // Xatolik
        if (["failed", "error"].includes(data.status)) {
          stopPolling();
          stopCountdown();
        }

      } catch {}
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
  };

  // ================================
  // ⏳ TIMER
  // ================================
  const startCountdown = (sec) => {
    stopCountdown();
    setCountdown(sec);

    countdownRef.current = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          stopCountdown();
          setShowModal(false);
          alert("⏰ To‘lov muddati tugadi");
          setPaymentStatus("expired");
          return 0;
        }
        return n - 1;
      });
    }, 1000);
  };

  const stopCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  useEffect(() => {
    return () => {
      stopPolling();
      stopCountdown();
    };
  }, []);

  // Copy handlers - alohida animatsiyalar
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

  // "To'lov qildim" tugmasi - payment_info dan pending ga o'tish
  const handlePaymentDone = () => {
    setPaymentStatus("pending");
  };

  // "Tushundim" tugmasi - warning modaldan payment modalga o'tish
  const handleWarningUnderstood = () => {
    setShowWarningModal(false);
    setShowModal(true);
  };

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ================================
  // UI
  // ================================
  return (
    <div className="premium-container">
      <button className="btn-back-top" onClick={() => navigate("/")}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        Orqaga
      </button>

      <div className="premium-header-container">
        <TGSSticker stickerPath={premiumSticker} className="premium-header-sticker" />
      </div>

      <div className="premium-page-title">
        <h1>Telegram Premium</h1>
        <p>xarid qilish</p>
      </div>

      {/* SEARCH */}
      <div className="search-row">
        <div className="username-row" style={{ width: "100%" }}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Foydalanuvchi nomi @username"
          />
          {/* 🔹 Faqat Telegram Mini App’da */}
          {window?.Telegram?.WebApp && (
            <button
              type="button"
              className="btn-my"
              onClick={fillMyUsername}
            >
              O‘zim
            </button>
          )}
        </div>
        {loadingProfile && <div className="loader-arc">🔄</div>}
      </div>

      {searchError && <div className="error">{searchError}</div>}

      {profile && (
        <div className="profile-preview">
          <img src={profile.imageUrl || "../src/assets/default_image.png"} />
          <div>
            <b>{profile.fullName}</b>
            <p>@{profile.username}</p>
          </div>
        </div>
      )}

      {/* PLANS */}
      <h3>Muddatni tanlang:</h3>

      <div className="plans">
        {plans.map((p) => (
          <label key={p.id} className={selectedPlan.id === p.id ? "plan selected" : "plan"}>
            <input
              type="radio"
              name="plan"
              checked={selectedPlan.id === p.id}
              onChange={() => setSelectedPlan(p)}
            />

            <img src={premiumGif} className="plan-gif" />

            <div className="narx">
              <span>{p.label}</span>
              <span>{formatAmount(p.price)} so'm</span>
            </div>
          </label>
        ))}
      </div>

      <div className="actions">
        <button disabled={loadingBuy} onClick={handleCreateOrder}>
          {loadingBuy ? "Yuklanmoqda..." : "Premium olish"}
        </button>
      </div>

      {/* WARNING MODAL */}
      {showWarningModal && order && (
        <div className="modal-overlay">
          <div className="modal-content warning-modal">
            <div className="warning-modal-header">
              <h3 className="warning-modal-title">Diqqat</h3>
            </div>
            
            <div className="warning-modal-body">
              <p className="warning-message">
                Kartaga bot ko'rsatgan summani aynan o'sha miqdorda yuboring.
              </p>
              
              <p className="warning-message-sub">
                Summadagi 1 so'mlik farq ham to'lovni aniqlashga xalaqit beradi.
              </p>
              
              <div className="warning-amount-highlight">
                <span className="warning-label">To'lov summasi</span>
                <span className="warning-amount">{formatAmount(order?.amount)} so'm</span>
              </div>
            </div>
            
            <button type="button" className="warning-understand-btn" onClick={handleWarningUnderstood}>
              ✅ Tushundim
            </button>
          </div>
        </div>
      )}

      {/* MODAL */}
      {showModal && order && (
        <div className="modal-overlay">
          <div className="modal-content">

            {/* PAYMENT_INFO - To'lov ma'lumotlari va "To'lov qildim" tugmasi */}
            {paymentStatus === "payment_info" && (
              <div className="pending-section">
                {/* Modal Header */}
                <div className="modal-header-bar">
                  <span className="modal-header-title">💳 Premium xarid qilish</span>
                  <button type="button" className="modal-close-x" onClick={() => {
                    stopPolling();
                    stopCountdown();
                    setShowModal(false);
                  }}>✕</button>
                </div>

                {/* Profile Card */}
                {profile && (
                  <div className="modal-profile-card">
                    <img
                      src={profile.imageUrl || "../src/assets/default_image.png"}
                      className="modal-profile-img"
                    />
                    <div className="modal-profile-info">
                      <div className="modal-profile-name">{profile.fullName}</div>
                      <div className="modal-profile-username">@{profile.username}</div>
                    </div>
                    <div className="modal-premium-badge">💎 {order.muddat_oy} oy</div>
                  </div>
                )}

                {/* Payment Info Cards */}
                <div className="modal-payment-grid">
                  <div className="modal-pay-item">
                    <div className="modal-pay-label">Karta raqami</div>
                    <div className="modal-pay-row">
                      <span className="modal-pay-value">{CARD_NUMBER}</span>
                      <button type="button" className="modal-copy-btn" onClick={handleCopyCard}>
                        {copiedCard ? "✓" : "📋"}
                      </button>
                    </div>
                  </div>

                  <div className="modal-pay-item">
                    <div className="modal-pay-label">Karta egasi</div>
                    <div className="modal-pay-row">
                      <span className="modal-pay-value">{CARD_NAME}</span>
                    </div>
                  </div>

                  <div className="modal-pay-item highlight">
                    <div className="modal-pay-label">To'lov summasi</div>
                    <div className="modal-pay-row">
                      <span className="modal-pay-value bold">{formatAmount(order.amount)} so'm</span>
                      <button type="button" className="modal-copy-btn" onClick={handleCopyAmount}>
                        {copiedAmount ? "✓" : "📋"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="modal-warning">
                  <span className="modal-warning-icon">⚠️</span>
                  <span>Aynan <b>{formatAmount(order.amount)} so'm</b> to'lang! Aks holda to'lov ko'rinmaydi.</span>
                </div>

                {/* Timer */}
                <div className="modal-status-bar">
                  <div className="modal-timer">
                    <div className="modal-timer-icon">⏳</div>
                    <span>{formatTime(countdown)}</span>
                  </div>
                </div>

                {/* To'lov qildim button */}
                <button type="button" className="btn-payment-done" onClick={handlePaymentDone}>
                  ✅ To'lov qildim
                </button>
                <p className="modal-close-hint">To'lovni amalga oshiring va tugmani bosing</p>
              </div>
            )}

            {/* PENDING - To'lov kutilmoqda */}
            {paymentStatus === "pending" && (
              <div className="pending-section">
                {/* Modal Header */}
                <div className="modal-header-bar">
                  <span className="modal-header-title">⏳ To'lov kutilmoqda</span>
                  <button type="button" className="modal-close-x" onClick={() => {
                    stopPolling();
                    stopCountdown();
                    setShowModal(false);
                  }}>✕</button>
                </div>

                {/* Waiting Animation */}
                <div className="waiting-animation-wrap">
                  <div className="waiting-circle-outer">
                    <div className="waiting-circle-inner">
                      <div className="waiting-icon">🔍</div>
                    </div>
                  </div>
                  <div className="waiting-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>

                <h3 className="waiting-title">To'lov qidirilmoqda...</h3>
                <p className="waiting-subtitle">To'lovingiz avtomatik aniqlanadi</p>

                {/* Payment Info */}
                <div className="waiting-payment-info">
                  <div className="waiting-info-row">
                    <span className="waiting-label">Karta:</span>
                    <span className="waiting-value">{CARD_NUMBER}</span>
                    <button type="button" className="modal-copy-btn-sm" onClick={handleCopyCard}>
                      {copiedCard ? "✓" : "📋"}
                    </button>
                  </div>
                  <div className="waiting-info-row highlight">
                    <span className="waiting-label">Summa:</span>
                    <span className="waiting-value bold">{formatAmount(order.amount)} so'm</span>
                  </div>
                </div>

                {/* Timer */}
                <div className="waiting-timer">
                  <span className="timer-icon-sm">⏱️</span>
                  <span>{formatTime(countdown)}</span>
                </div>

                {cardLast4 && (
                  <div className="modal-card-detected">
                    <span>✅ Karta aniqlandi: **** {cardLast4}</span>
                  </div>
                )}

                <p className="modal-close-hint">Oyna yopilsa ham to'lov kuzatiladi</p>
              </div>
            )}

            {/* PAYMENT RECEIVED - To'lov qabul qilindi */}
            {paymentStatus === "payment_received" && (
              <div className="modal-sending-section">
                <div className="sending-anim-wrap">
                  <div className="sending-pulse-ring"></div>
                  <div className="sending-pulse-ring delay"></div>
                  <div className="sending-center-icon">💎</div>
                </div>
                <h3 className="sending-title">To'lov qabul qilindi!</h3>
                <p className="sending-subtitle">Premium yuborilmoqda...</p>

                {profile && (
                  <div className="sending-recipient">
                    <img src={profile.imageUrl || "../src/assets/default_image.png"} className="sending-avatar" />
                    <div className="sending-info">
                      <span className="sending-name">{profile.fullName}</span>
                      <span className="sending-user">@{profile.username}</span>
                    </div>
                    <div className="sending-premium-badge">💎 {order.muddat_oy} oy</div>
                  </div>
                )}

                <div className="sending-progress-bar">
                  <div className="sending-progress-fill premium"></div>
                </div>
                <p className="sending-hint">Biroz kuting, jarayon avtomatik...</p>
              </div>
            )}

            {/* PREMIUM SENT - Muvaffaqiyatli */}
            {paymentStatus === "premium_sent" && (
              <div className="modal-success-section">
                <div className="success-confetti">
                  <span></span><span></span><span></span><span></span><span></span><span></span>
                </div>

                <div className="success-check-wrap">
                  <svg className="success-check-svg" viewBox="0 0 52 52">
                    <circle className="success-check-circle" cx="26" cy="26" r="25" fill="none" />
                    <path className="success-check-path" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
                  </svg>
                </div>

                <h3 className="success-title">Muvaffaqiyatli! 🎉</h3>
                <p className="success-amount">{order.muddat_oy} oylik Premium yuborildi</p>

                {profile && (
                  <div className="success-recipient-card">
                    <img src={profile.imageUrl || "../src/assets/default_image.png"} className="success-avatar" />
                    <div className="success-user-info">
                      <span className="success-user-name">{profile.fullName}</span>
                      <span className="success-user-handle">@{profile.username}</span>
                    </div>
                    <div className="success-delivered-badge">✓ Yetkazildi</div>
                  </div>
                )}

                <div className="success-details">
                  <div className="success-detail-row">
                    <span className="success-detail-label">Premium</span>
                    <span className="success-detail-value">💎 {order.muddat_oy} oy</span>
                  </div>
                  <div className="success-detail-row">
                    <span className="success-detail-label">To'lov</span>
                    <span className="success-detail-value">{formatAmount(order.amount)} so'm</span>
                  </div>
                </div>

                <button type="button" className="modal-close-btn success-close" onClick={() => setShowModal(false)}>
                  Yopish
                </button>
              </div>
            )}

            {/* FAILED / ERROR */}
            {["failed", "error"].includes(paymentStatus) && (
              <div className="modal-error-section">
                <div className="error-icon-wrap">
                  <span className="error-icon">❌</span>
                </div>
                <h3 className="error-title">Xatolik yuz berdi</h3>
                <p className="error-desc">Premium yuborishda muammo chiqdi. Iltimos, qaytadan urinib ko'ring.</p>
                
                <button type="button" className="modal-close-btn" onClick={() => {
                  setShowModal(false);
                  setPaymentStatus("idle");
                }}>
                  Yopish
                </button>
              </div>
            )}

            {/* EXPIRED */}
            {paymentStatus === "expired" && (
              <div className="modal-error-section">
                <div className="error-icon-wrap">
                  <span className="error-icon">⏰</span>
                </div>
                <h3 className="error-title">Vaqt tugadi</h3>
                <p className="error-desc">To'lov muddati o'tib ketdi. Qaytadan urinib ko'ring.</p>
                
                <button type="button" className="modal-close-btn" onClick={() => {
                  setShowModal(false);
                  setPaymentStatus("idle");
                }}>
                  Yopish
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* NAVIGATION */}
      {/* <div className="btn-container">
        <button className="btn-nav" onClick={() => navigate("/")}>⬅️Orqaga</button>
        <button className="btn-nav" onClick={() => navigate("/stars")}>Stars</button>
      </div> */}

    </div>
  );
}
