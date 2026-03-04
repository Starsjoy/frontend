import React, { useEffect, useState, useRef } from "react";
import starsSticker from "../../assets/AnimatedSticker_stars.tgs";
import { TGSSticker } from "../../components/TGSSticker";
import { useNavigate } from "react-router-dom";
import apiFetch from "../../utils/apiFetch";
import "./Discount.css";

const POLLING_DURATION = 5 * 60 * 1000;

export default function Discount() {
  const CARD_NUMBER = import.meta.env.VITE_CARD_NUMBER;
  const CARD_NAME = import.meta.env.VITE_CARD_NAME;

  // Discount packages from API
  const [discountPackages, setDiscountPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(true);

  const [username, setUsername] = useState("");
  const [selectedOption, setSelectedOption] = useState(null);
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("pending");
  const [txId, setTxId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [timer, setTimer] = useState(20);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [countdown, setCountdown] = useState(300);

  const pollingRef = useRef(null);
  const countdownRef = useRef(null);

  const navigate = useNavigate();

  // Fetch discount packages from API
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const res = await apiFetch("/api/discount-packages");
        const data = await res.json();
        // Map to expected format
        const packages = data.map(pkg => ({
          stars: pkg.stars,
          discountedPrice: pkg.discounted_price,
          discount: pkg.discount_percent
        }));
        setDiscountPackages(packages);
      } catch (err) {
        console.error("❌ Paketlarni yuklashda xato:", err);
      } finally {
        setPackagesLoading(false);
      }
    };
    fetchPackages();
  }, []);

  const goToHome = () => {
    setShowModal(false);
    navigate("/");
  };

  // Telegramdan username olish
  const fillMyUsername = () => {
    try {
      const tgUser = window?.Telegram?.WebApp?.initDataUnsafe?.user?.username;
      if (!tgUser) {
        alert("Telegram username topilmadi");
        return;
      }
      setUsername(tgUser);
    } catch (err) {
      console.error("Telegram username olishda xato:", err);
    }
  };

  const formatAmount = (num) =>
    num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  // Timer for stars_sent
  useEffect(() => {
    if (status === "stars_sent") {
      const countdownInterval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setShowModal(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(countdownInterval);
    }
  }, [status]);

  // Telegram username auto-fill
  useEffect(() => {
    try {
      const tgUser = window?.Telegram?.WebApp?.initDataUnsafe?.user?.username;
      if (tgUser) {
        setUsername(tgUser);
      }
    } catch (err) {
      console.error("Telegram username olishda xato:", err);
    }
  }, []);

  // Real-time search (RobynHood API)
  useEffect(() => {
    if (!username) {
      setProfile(null);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setLoadingProfile(true);
        const cleanUsername = username.startsWith("@")
          ? username.slice(1)
          : username;

        const profileRes = await apiFetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: cleanUsername }),
        });

        const data = await profileRes.json();
        if (profileRes.ok) setProfile(data);
        else setProfile(null);
      } catch (err) {
        console.error("❌ Profil qidiruv xato:", err);
        setProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [username]);

  // Copy handlers
  const handleCopy = () => {
    navigator.clipboard.writeText(CARD_NUMBER);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyamount = () => {
    navigator.clipboard.writeText(order?.amount);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Polling functions
  useEffect(() => {
    const savedOrder = localStorage.getItem("pendingDiscountOrder");
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        const createdAt = new Date(parsed.createdAt).getTime();
        const now = Date.now();
        const elapsed = now - createdAt;

        if (elapsed < POLLING_DURATION) {
          setOrder(parsed.order);
          setStatus(parsed.status || "pending");

          const remainingMs = POLLING_DURATION - elapsed;
          const remainingSec = Math.floor(remainingMs / 1000);
          setCountdown(remainingSec);

          startPolling(parsed.order);
          startCountdownTimer(remainingSec);

          if (parsed.status === "pending" || parsed.status === "payment_received") {
            setShowModal(true);
          }
        } else {
          localStorage.removeItem("pendingDiscountOrder");
        }
      } catch (e) {
        localStorage.removeItem("pendingDiscountOrder");
      }
    }

    return () => {
      stopPolling();
      stopCountdown();
    };
  }, []);

  const startPolling = (orderData) => {
    stopPolling();

    pollingRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/transactions/${orderData.id}`);
        const data = await res.json();

        if (data.status !== status) {
          setStatus(data.status);

          const saved = localStorage.getItem("pendingDiscountOrder");
          if (saved) {
            const parsed = JSON.parse(saved);
            parsed.status = data.status;
            localStorage.setItem("pendingDiscountOrder", JSON.stringify(parsed));
          }
        }

        if (data.status === "stars_sent") {
          stopPolling();
          stopCountdown();
          localStorage.removeItem("pendingDiscountOrder");
          setTxId(data.transaction_id);
          setShowModal(true);
        }

        if (["expired", "failed", "error"].includes(data.status)) {
          stopPolling();
          stopCountdown();
          localStorage.removeItem("pendingDiscountOrder");
        }
      } catch (err) {
        console.error("⚠️ Status olish xato:", err);
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startCountdownTimer = (initialSeconds = 300) => {
    stopCountdown();
    setCountdown(initialSeconds);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          stopCountdown();
          stopPolling();
          localStorage.removeItem("pendingDiscountOrder");
          setStatus("expired");
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

  const saveOrderToStorage = (orderData) => {
    const data = {
      order: orderData,
      createdAt: new Date().toISOString(),
      status: "pending",
    };
    localStorage.setItem("pendingDiscountOrder", JSON.stringify(data));
  };

  // Handle option select
  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };

  // Create order
  const handlePayment = async () => {
    if (!selectedOption) {
      alert("Iltimos, paketni tanlang!");
      return;
    }

    if (!username) {
      alert("Iltimos, username kiriting!");
      return;
    }

    if (!profile || !profile.recipient) {
      alert("Foydalanuvchi topilmadi!");
      return;
    }

    try {
      const res = await apiFetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: profile.username,
          recipient: profile.recipient,
          stars: selectedOption.stars,
          amount: selectedOption.discountedPrice,
        }),
      });

      const newOrder = await res.json();
      setOrder(newOrder);
      setStatus("pending");
      setShowModal(true);

      saveOrderToStorage(newOrder);
      startPolling(newOrder);
      startCountdownTimer(300);
    } catch (err) {
      console.error("❌ Order yaratishda xato:", err);
      alert("Order yaratishda xato");
    }
  };

  const formatTime = (sec) => {
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return `${min.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="discount-container">
      <button className="btn-back-top" onClick={goToHome}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        Orqaga
      </button>

      <div className="discount-header-container">
        <TGSSticker stickerPath={starsSticker} className="discount-header-sticker" />
      </div>

      <div className="discount-page-title">
        <h1>Chegirma Paketlari</h1>
        <p>Maxsus narxlarda Stars xarid qiling</p>
      </div>

      {/* Profile */}
      {profile && (
        <div className="profile-preview-small">
          <img
            src={profile.imageUrl || "../src/assets/default_image.png"}
            className="profile-img-small"
          />
          <div className="profile-info">
            <div className="name">{profile.fullName}</div>
            <div className="username">@{profile.username}</div>
          </div>
        </div>
      )}

      {loadingProfile && (
        <div className="loader-arc">
          <div className="loader-arc-1"></div>
          <div className="loader-arc-2">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}

      {/* Username Input */}
      <div className="search-row">
        <div className="username-row" style={{ width: "100%" }}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Foydalanuvchi nomi @username"
          />
          {window?.Telegram?.WebApp && (
            <button type="button" className="btn-my" onClick={fillMyUsername}>
              O'zim
            </button>
          )}
        </div>
      </div>

      {/* Package Options */}
      <div className="discount-packages">
        <p className="discount-section-title">Paketni tanlang:</p>
        {packagesLoading ? (
          <div className="packages-loading">⏳ Paketlar yuklanmoqda...</div>
        ) : discountPackages.length === 0 ? (
          <div className="packages-empty">Hozircha chegirma paketlari yo'q</div>
        ) : (
          <div className="package-list">
            {discountPackages.map((option, idx) => (
              <div
                key={idx}
                className={`package-card ${selectedOption?.stars === option.stars ? "selected" : ""}`}
                onClick={() => handleOptionSelect(option)}
              >
                <div className="package-discount-badge">-{option.discount}%</div>
                <div className="package-stars">
                  <span className="package-star-icon">⭐</span>
                  <span className="package-star-count">{formatAmount(option.stars)}</span>
                </div>
                <div className="package-price">
                  {formatAmount(option.discountedPrice)} so'm
                </div>
                <div className="package-original-price">
                  {formatAmount(Math.round(option.discountedPrice / (1 - option.discount / 100)))} so'm
                </div>
                {selectedOption?.stars === option.stars && (
                  <div className="package-check">✓</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="discount-actions">
        <button 
          className={`discount-button ${!selectedOption ? "disabled" : ""}`} 
          onClick={handlePayment}
          disabled={!selectedOption}
        >
          {selectedOption 
            ? `Stars olish - ${formatAmount(selectedOption.discountedPrice)} so'm`
            : "Paketni tanlang"
          }
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            {/* PENDING */}
            {status === "pending" && (
              <div className="pending-section">
                <div className="modal-header-bar">
                  <span className="modal-header-title">To'lov ma'lumotlari</span>
                  <button className="modal-close-x" onClick={() => setShowModal(false)}>✕</button>
                </div>

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
                    <div className="modal-stars-badge">⭐ {order?.stars}</div>
                  </div>
                )}

                <div className="modal-payment-grid">
                  <div className="modal-pay-item">
                    <div className="modal-pay-label">Karta raqami</div>
                    <div className="modal-pay-row">
                      <span className="modal-pay-value">{CARD_NUMBER}</span>
                      <button className="modal-copy-btn" onClick={handleCopy}>
                        {copied ? "✓" : "📋"}
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
                      <span className="modal-pay-value bold">{formatAmount(order?.amount)} so'm</span>
                      <button className="modal-copy-btn" onClick={handleCopyamount}>
                        {copied ? "✓" : "📋"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="modal-warning-alert">
                  <div className="warning-pulse"></div>
                  <div className="warning-content">
                    <span className="warning-icon-lg">⚠️</span>
                    <div className="warning-text">
                      <span className="warning-label">MUHIM!</span>
                      <span className="warning-amount">Aynan {formatAmount(order?.amount)} so'm</span>
                      <span className="warning-note">to'lang, aks holda to'lov ko'rinmaydi</span>
                    </div>
                  </div>
                </div>

                <div className="modal-status-bar">
                  <div className="modal-timer">
                    <div className="modal-timer-icon">⏳</div>
                    <span>{formatTime(countdown)}</span>
                  </div>
                  <div className="modal-waiting">
                    <div className="modal-spinner"></div>
                    <span>To'lov kutilmoqda...</span>
                  </div>
                </div>

                <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                  Yopish
                </button>
                <p className="modal-close-hint">Oyna yopilsa ham to'lov kuzatiladi</p>
              </div>
            )}

            {/* PAYMENT RECEIVED */}
            {status === "payment_received" && (
              <div className="modal-sending-section">
                <div className="sending-anim-wrap">
                  <div className="sending-pulse-ring"></div>
                  <div className="sending-pulse-ring delay"></div>
                  <div className="sending-center-icon">💫</div>
                </div>
                <h3 className="sending-title">To'lov qabul qilindi!</h3>
                <p className="sending-subtitle">Stars yuborilmoqda...</p>

                {profile && (
                  <div className="sending-recipient">
                    <img src={profile.imageUrl || "../src/assets/default_image.png"} className="sending-avatar" />
                    <div className="sending-info">
                      <span className="sending-name">{profile.fullName}</span>
                      <span className="sending-user">@{profile.username}</span>
                    </div>
                    <div className="sending-stars-count">⭐ {order?.stars}</div>
                  </div>
                )}

                <div className="sending-progress-bar">
                  <div className="sending-progress-fill"></div>
                </div>
                <p className="sending-hint">Biroz kuting, jarayon avtomatik...</p>
              </div>
            )}

            {/* COMPLETED */}
            {status === "completed" && (
              <div className="modal-sending-section">
                <div className="sending-anim-wrap">
                  <div className="sending-pulse-ring"></div>
                  <div className="sending-pulse-ring delay"></div>
                  <div className="sending-center-icon">🚀</div>
                </div>
                <h3 className="sending-title">To'lov tasdiqlandi!</h3>
                <p className="sending-subtitle">Stars yuborilmoqda...</p>

                {profile && (
                  <div className="sending-recipient">
                    <img src={profile.imageUrl || "../src/assets/default_image.png"} className="sending-avatar" />
                    <div className="sending-info">
                      <span className="sending-name">{profile.fullName}</span>
                      <span className="sending-user">@{profile.username}</span>
                    </div>
                    <div className="sending-stars-count">⭐ {order?.stars}</div>
                  </div>
                )}

                <div className="sending-progress-bar">
                  <div className="sending-progress-fill"></div>
                </div>
                <p className="sending-hint">Biroz kuting, jarayon avtomatik...</p>
              </div>
            )}

            {/* STARS SENT */}
            {status === "stars_sent" && (
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
                <p className="success-amount">{order?.stars} ⭐ yuborildi</p>

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
                    <span className="success-detail-label">Stars</span>
                    <span className="success-detail-value">{order?.stars} ⭐</span>
                  </div>
                  <div className="success-detail-row">
                    <span className="success-detail-label">To'lov</span>
                    <span className="success-detail-value">{formatAmount(order?.amount)} so'm</span>
                  </div>
                </div>

                {txId && (
                  <div className="modal-txid">
                    <span className="modal-txid-label">Tranzaksiya ID</span>
                    <div className="modal-txid-row">
                      <code>{txId}</code>
                      <button className="modal-copy-btn" onClick={() => navigator.clipboard.writeText(txId)}>
                        📋
                      </button>
                    </div>
                  </div>
                )}

                <p className="modal-auto-close">Oyna {timer}s da yopiladi</p>
                <button className="modal-close-btn success-close" onClick={() => setShowModal(false)}>Yopish</button>
              </div>
            )}

            {/* EXPIRED */}
            {status === "expired" && (
              <div className="modal-result-section">
                <div className="modal-result-icon expired-bg">⏰</div>
                <h3 className="modal-result-title">Vaqt tugadi</h3>
                <p className="modal-result-desc">To'lov muddati o'tib ketdi. Qaytadan urinib ko'ring.</p>
                <button className="modal-close-btn" onClick={() => setShowModal(false)}>Yopish</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
