import React, { useEffect, useState, useRef } from "react";
import starsSticker from "../../assets/AnimatedSticker_stars.tgs";
import { TGSSticker } from "../../components/TGSSticker";
import { useNavigate } from "react-router-dom";
import apiFetch from "../../utils/apiFetch";
import "./home.css";

// Star Icon Component
const StarIcon = () => (
  <svg height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" style={{ marginRight: '8px', marginTop: '-2px' }}>
    <defs>
      <path id="a" d="m6.02 4.99 2.21-4.42c.25-.51.86-.72 1.37-.46.2.1.36.27.46.47l2.08 4.26c.17.34.5.58.88.63l4.36.52c.59.08 1.02.62.95 1.22-.03.24-.14.47-.32.65l-3.45 3.42c-.14.13-.2.33-.18.53l.57 4.61c.09.66-.38 1.27-1.03 1.35-.25.03-.5-.02-.72-.14l-3.64-2c-.26-.14-.58-.15-.85-.01l-3.77 1.95c-.53.27-1.18.06-1.45-.48-.11-.2-.14-.43-.11-.65l.3-2.12c.15-1.04.79-1.93 1.71-2.41l4.19-2.15c.11-.06.15-.2.1-.31-.05-.09-.14-.14-.24-.12l-5.12.74c-.78.11-1.58-.11-2.19-.62l-1.71-1.4c-.49-.4-.56-1.12-.17-1.62.19-.22.45-.37.74-.41l4.38-.57c.28-.03.52-.21.65-.46z" />
      <linearGradient id="b" x1="25%" x2="74.92%" y1=".825%" y2="107.86%">
        <stop offset="0" stopColor="#ffd951" />
        <stop offset="1" stopColor="#ffb222" />
      </linearGradient>
      <linearGradient id="c" x1="50%" x2="50%" y1="0%" y2="99.8%">
        <stop offset="0" stopColor="#e58f0d" />
        <stop offset=".9996" stopColor="#eb7915" />
      </linearGradient>
      <filter id="d" height="110.6%" width="110.3%" x="-5.2%" y="-5.3%">
        <feOffset dx="1" dy="1" in="SourceAlpha" result="shadowOffsetInner1" />
        <feComposite in="shadowOffsetInner1" in2="SourceAlpha" k2="-1" k3="1" operator="arithmetic" result="shadowInnerInner1" />
        <feColorMatrix in="shadowInnerInner1" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.657 0" />
      </filter>
    </defs>
    <g fill="none" fillRule="evenodd" transform="translate(1.389 1.389)">
      <use fill="url(#b)" fillRule="evenodd" xlinkHref="#a" />
      <use fill="#000" filter="url(#d)" xlinkHref="#a" />
      <use stroke="url(#c)" strokeWidth=".89" xlinkHref="#a" />
    </g>
  </svg>
);

// 5 daqiqa = 300 sekund
const POLLING_DURATION = 5 * 60 * 1000; // 5 daqiqa millisekondda

export default function Home() {
  const CARD_NUMBER = import.meta.env.VITE_CARD_NUMBER;
  const CARD_NAME = import.meta.env.VITE_CARD_NAME;
  const NARX = parseInt(import.meta.env.VITE_NARX);

  // Stars options
  const STARS_OPTIONS = [50, 100, 200, 350, 500, 750, 1000, 2000, 5000, 10000];

  // Discount packages map: { [stars]: { discount, discountedPrice, basePrice } }
  const [discountMap, setDiscountMap] = useState({});

  const [backendStatus, setBackendStatus] = useState("");
  const [username, setUsername] = useState("");
  const [stars, setStars] = useState("");
  const [price, setPrice] = useState(0);
  const [priceLoading, setPriceLoading] = useState(false);

  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("pending");
  const [txId, setTxId] = useState(null);
  const [copiedCard, setCopiedCard] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [timer, setTimer] = useState(20);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 daqiqa
  const [showMorePlans, setShowMorePlans] = useState(false);

  // Refs for polling (modal yopilsa ham davom etadi)
  const pollingRef = useRef(null);
  const countdownRef = useRef(null);

  const navigate = useNavigate();

  const goToPremium = () => {
    setShowModal(false);
    navigate("/premium");
  };

  const goToHome = () => {
    setShowModal(false);
    navigate("/");
  };

  // 🔹 Telegramdan username olish
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

  // Backend status
  useEffect(() => {
    apiFetch("/api/status")
      .then((res) => res.json())
      .then((data) => setBackendStatus(data.message))
      .catch(() => setBackendStatus("Backend offline ❌"));
  }, []);

  // Discount paketlarni yuklash
  useEffect(() => {
    apiFetch("/api/discount-packages")
      .then(res => res.json())
      .then(data => {
        const map = {};
        data.forEach(pkg => {
          if (pkg.slot_available !== false) {
            map[pkg.stars] = {
              id: pkg.id,
              discount: pkg.discount_percent,
              discountedPrice: pkg.current_price,
              basePrice: pkg.stars * NARX, // To'g'ri asl narx
            };
          }
        });
        setDiscountMap(map);
        console.log("✅ Discount map:", map); // Debug
      })
      .catch(err => {
        console.error("❌ Discount paketlarni yuklashda xato:", err);
      });
  }, []);

  // Stars price - backend dan slot-based narx olish
  useEffect(() => {
    if (!stars || parseInt(stars) < 50 || parseInt(stars) > 10000) {
      setPrice(0);
      return;
    }
    
    const starNum = parseInt(stars);
    setPriceLoading(true);
    
    // Slot-based narx - backend dan olish
    apiFetch(`/api/stars/price/${starNum}`)
      .then(res => res.json())
      .then(data => {
        if (data.available && data.price) {
          setPrice(data.price);
        } else {
          // Agar slot yo'q bo'lsa, 0 ko'rsatamiz
          setPrice(0);
        }
      })
      .catch(() => {
        // Xato bo'lsa fallback
        setPrice(starNum * NARX);
      })
      .finally(() => setPriceLoading(false));
  }, [stars]);

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

  // Copy card
  const handleCopy = () => {
    navigator.clipboard.writeText(CARD_NUMBER);
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 2000);
  };

  // Copy amount
  const handleCopyamount = () => {
    navigator.clipboard.writeText(order?.amount);
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  // ============================================
  // 🔄 PERSISTENT POLLING - Modal yopilsa ham davom etadi
  // ============================================

  // Sahifa yuklanganda saqlangan buyurtmani tekshirish
  useEffect(() => {
    const savedOrder = localStorage.getItem("pendingStarsOrder");
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        const createdAt = new Date(parsed.createdAt).getTime();
        const now = Date.now();
        const elapsed = now - createdAt;

        // 5 daqiqa o'tmagan bo'lsa, polling davom etadi
        if (elapsed < POLLING_DURATION) {
          setOrder(parsed.order);
          setStatus(parsed.status || "pending");

          // Qolgan vaqtni hisoblash
          const remainingMs = POLLING_DURATION - elapsed;
          const remainingSec = Math.floor(remainingMs / 1000);
          setCountdown(remainingSec);

          // Polling davom ettiramiz
          startPolling(parsed.order);
          startCountdownTimer(remainingSec);

          // Agar status pending/payment_info bo'lsa, modalni ochamiz
          if (parsed.status === "payment_info" || parsed.status === "pending" || parsed.status === "payment_received") {
            setShowModal(true);
          }

          console.log("📦 Avvalgi buyurtma topildi, polling davom etmoqda...");
        } else {
          // 5 daqiqa o'tgan, buyurtmani o'chiramiz
          localStorage.removeItem("pendingStarsOrder");
        }
      } catch (e) {
        localStorage.removeItem("pendingStarsOrder");
      }
    }

    // Cleanup on unmount
    return () => {
      stopPolling();
      stopCountdown();
    };
  }, []);

  // Polling boshlash (modal yopilsa ham davom etadi)
  const startPolling = (orderData) => {
    stopPolling(); // Avvalgisini to'xtatamiz

    pollingRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/transactions/${orderData.id}`);
        const data = await res.json();

        if (data.status !== status) {
          setStatus(data.status);

          // LocalStorage ni yangilaymiz
          const saved = localStorage.getItem("pendingStarsOrder");
          if (saved) {
            const parsed = JSON.parse(saved);
            parsed.status = data.status;
            localStorage.setItem("pendingStarsOrder", JSON.stringify(parsed));
          }
        }

        // ✅ Stars yuborildi
        if (data.status === "stars_sent") {
          stopPolling();
          stopCountdown();
          localStorage.removeItem("pendingStarsOrder");
          setTxId(data.transaction_id);
          setShowModal(true); // Muvaffaqiyat modalini ko'rsatish
        }

        // ❌ Expired yoki failed
        if (["expired", "failed", "error"].includes(data.status)) {
          stopPolling();
          stopCountdown();
          localStorage.removeItem("pendingStarsOrder");
        }
      } catch (err) {
        console.error("⚠️ Status olish xato:", err);
      }
    }, 3000); // Har 3 sekundda tekshirish
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  // Countdown timer (5 daqiqa)
  const startCountdownTimer = (initialSeconds = 300) => {
    stopCountdown();
    setCountdown(initialSeconds);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          stopCountdown();
          stopPolling();
          localStorage.removeItem("pendingStarsOrder");
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

  // Buyurtmani localStorage ga saqlash
  const saveOrderToStorage = (orderData) => {
    const data = {
      order: orderData,
      createdAt: new Date().toISOString(),
      status: "payment_info",
    };
    localStorage.setItem("pendingStarsOrder", JSON.stringify(data));
  };

  // "To'lov qildim" tugmasi bosilganda
  const handlePaymentDone = () => {
    setStatus("pending");
    // LocalStorage ni yangilaymiz
    const saved = localStorage.getItem("pendingStarsOrder");
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.status = "pending";
      localStorage.setItem("pendingStarsOrder", JSON.stringify(parsed));
    }
  };

  // 💳 Create order
  const handlePayment = async () => {
    const starNum = parseInt(stars);
    
    if (!stars || starNum < 50 || starNum > 10000) {
      alert("Stars miqdori 50 dan 10000 gacha bo'lishi kerak!");
      return;
    }

    if (!username) {
      alert("Iltimos, username va stars kiriting!");
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
          stars: parseInt(stars),
          amount: price,
        }),
      });

      // Error tekshirish
      if (!res.ok) {
        const errorData = await res.json();
        
        // SLOTS_FULL xatosi
        if (errorData.code === "SLOTS_FULL") {
          alert("⏳ Hozirda juda ko'p buyurtmalar mavjud.\n\nIltimos, 1-2 daqiqadan keyin qayta urinib ko'ring.");
          return;
        }
        
        throw new Error(errorData.error || "Server xatosi");
      }

      const newOrder = await res.json();
      setOrder(newOrder);
      setStatus("payment_info");
      
      // Birinchi ogohlantirish modalini ko'rsatamiz
      setShowWarningModal(true);

      // LocalStorage ga saqlash (modal yopilsa ham polling davom etadi)
      saveOrderToStorage(newOrder);

      // Polling va countdown boshlash
      startPolling(newOrder);
      startCountdownTimer(300); // 5 daqiqa
    } catch (err) {
      console.error("❌ Order yaratishda xato:", err);
      alert(err.message || "Order yaratishda xato");
    }
  };

  // "Tushundim" tugmasi bosilganda - ogohlantirish modalini yopib, to'lov modalini ochamiz
  const handleWarningUnderstood = () => {
    setShowWarningModal(false);
    setShowModal(true);
  };

  const formatTime = (sec) => {
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return `${min.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="home-container">
      <button className="btn-back-top" onClick={goToHome}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        Orqaga
      </button>

      <div className="stars-header-container">
        <TGSSticker stickerPath={starsSticker} className="stars-header-sticker" />
      </div>

      <div className="stars-page-title">
        <h1>Telegram Stars</h1>
        <p>xarid qilish</p>
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

      {/* SEARCH */}
      <div className="search-row">
        <div className="username-row" style={{ width: "100%" }}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Foydalanuvchi nomi @username"
          />
          {/* 🔹 Faqat Telegram Mini App'da */}
          {window?.Telegram?.WebApp && (
            <button type="button" className="btn-my" onClick={fillMyUsername}>
              O'zim
            </button>
          )}
        </div>
      </div>

      <h3>Stars miqdorini kiriting:</h3>
      <div className="input-group">
        <input
          className="tg-input"
          type="number"
          value={stars}
          onChange={(e) => setStars(e.target.value)}
          placeholder="50 dan 100,000 tagacha"
        />
      </div>

      {/* Stars Options */}
      <div className="preset-options-section">
        <h3 style={{color: '#fff', margin: '24px 0 12px 0', fontSize: '16px', fontWeight: '600'}}>Yoki to'plamni tanlang:</h3>
        <div style={{display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px'}}>
          {(showMorePlans ? STARS_OPTIONS : STARS_OPTIONS.slice(0, 3)).map((starAmount, idx) => {
            const maxPrice = starAmount * NARX;
            const discountPkg = discountMap[starAmount];

            if (discountPkg) {
              // Bu amount uchun chegirma paket mavjud — discount ko'rinishida chiqar
              return (
                <div
                  key={idx}
                  onClick={() => navigate('/discount', { state: { selectedPackageId: discountPkg.id } })}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: 'linear-gradient(135deg, rgba(249,168,37,0.18) 0%, rgba(255,204,2,0.08) 100%)',
                    border: '2px solid rgba(249,168,37,0.5)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    overflow: 'hidden'
                  }}
                >
                  {/* Chegirma badge */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: 'linear-gradient(135deg, #f9a825, #ffcc02)',
                    color: '#1a1a2e',
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '3px 10px',
                    borderRadius: '0 8px 0 8px'
                  }}>
                    -{discountPkg.discount}%
                  </div>

                  <span style={{color: '#fff', fontSize: '14px', fontWeight: '500', flex: 1, display: 'flex', alignItems: 'center'}}>
                    <StarIcon />
                    {starAmount >= 1000 ? (starAmount / 1000) + 'K' : starAmount} Stars
                  </span>

                  <div style={{textAlign: 'right'}}>
                    <div style={{color: '#f9a825', fontSize: '13px', fontWeight: '700'}}>
                      {formatAmount(discountPkg.discountedPrice)} UZS
                    </div>
                    <div style={{color: 'rgba(255,255,255,0.45)', fontSize: '11px', textDecoration: 'line-through'}}>
                      {formatAmount(maxPrice)} UZS
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={idx}
                onClick={() => setStars(String(starAmount))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 14px',
                  background: stars === String(starAmount) ? 'rgba(102, 126, 234, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  border: stars === String(starAmount) ? '2px solid #667eea' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{color: '#fff', fontSize: '14px', fontWeight: '500', flex: 1, display: 'flex', alignItems: 'center'}}>
                  <StarIcon />
                  {starAmount >= 1000 ? (starAmount / 1000) + 'K' : starAmount} Stars
                </span>
                <span style={{color: '#4ee0ff', fontSize: '13px', fontWeight: '600'}}>
                  {formatAmount(maxPrice)} UZS
                </span>
              </div>
            );
          })}
        </div>
        
        {/* MORE OPTIONS DROPDOWN */}
        {STARS_OPTIONS.length > 3 && (
          <div style={{textAlign: 'center', marginBottom: '20px'}}>
            <button onClick={() => setShowMorePlans(!showMorePlans)} style={{
              background: 'none',
              border: 'none',
              color: '#667eea',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              textDecoration: 'none',
              transition: 'all 0.2s ease'
            }}>
              {showMorePlans ? 'Kamroq variantlarni yashiring ▲' : "Ko'proq variantlarni ko'rsatish ▼"}
            </button>
          </div>
        )}
      </div>

      <div className="actions">
        <button type="button" className="tg-button" onClick={handlePayment}>
          Stars olish {price > 0 && `- ${formatAmount(price)} so'm`}
        </button>
      </div>

      {/* ---------------- WARNING MODAL ---------------- */}
      {showWarningModal && (
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
                <span className="warning-amount">{formatAmount(order?.amount)}</span>
              </div>
            </div>
            
            <button type="button" className="warning-understand-btn" onClick={handleWarningUnderstood}>
              ✅ Tushundim
            </button>
          </div>
        </div>
      )}

      {/* ---------------- MODAL ---------------- */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">

            {/* PAYMENT INFO - To'lov ma'lumotlari */}
            {status === "payment_info" && (
              <div className="payment-info-section">
                {/* Modal Header */}
                <div className="modal-header-bar">
                  <span className="modal-header-title">To'lov ma'lumotlari</span>
                  <button type="button" className="modal-close-x" onClick={() => setShowModal(false)}>✕</button>
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
                    <div className="modal-stars-badge">⭐ {order?.stars}</div>
                  </div>
                )}

                {/* Payment Info Cards */}
                <div className="modal-payment-grid">
                  <div className="modal-pay-item">
                    <div className="modal-pay-label">Karta raqami</div>
                    <div className="modal-pay-row">
                      <span className="modal-pay-value">{CARD_NUMBER}</span>
                      <button type="button" className="modal-copy-btn" onClick={handleCopy}>
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

                  <div className="modal-pay-item highlight-amount">
                    <div className="modal-pay-label">To'lov summasi</div>
                    <div className="modal-pay-row">
                      <span className="modal-pay-value bold">{formatAmount(order?.amount)} so'm</span>
                      <button type="button" className="modal-copy-btn" onClick={handleCopyamount}>
                        {copiedAmount ? "✓" : "📋"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Attention Warning */}
                <div className="modal-warning-attention">
                  <div className="warning-pulse"></div>
                  <span className="warning-icon-big">⚠️</span>
                  <div className="warning-text">
                    <strong>DIQQAT!</strong>
                    <p>Aynan <span className="amount-highlight">{formatAmount(order?.amount)} so'm</span> yuboring!</p>
                    <p className="warning-sub">Boshqa summa yuborilsa to'lov ko'rinmaydi</p>
                  </div>
                </div>

                {/* Timer */}
                <div className="modal-timer-bar">
                  <div className="modal-timer">
                    <span className="timer-icon">⏳</span>
                    <span className="timer-text">{formatTime(countdown)}</span>
                  </div>
                </div>

                {/* Pay Button */}
                <button type="button" className="btn-payment-done" onClick={handlePaymentDone}>
                  ✅ To'lov qildim
                </button>
                <p className="modal-close-hint">To'lovni amalga oshiring va tugmani bosing</p>
              </div>
            )}

            {/* PENDING - To'lov kutilmoqda */}
            {status === "pending" && (
              <div className="pending-waiting-section">
                <div className="modal-header-bar">
                  <span className="modal-header-title">⏳ To'lov kutilmoqda</span>
                  <button type="button" className="modal-close-x" onClick={() => setShowModal(false)}>✕</button>
                </div>

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

                <div className="waiting-payment-info">
                  <div className="waiting-info-row">
                    <span className="waiting-label">Karta:</span>
                    <span className="waiting-value">{CARD_NUMBER}</span>
                    <button type="button" className="modal-copy-btn-sm" onClick={handleCopy}>
                      {copiedCard ? "✓" : "📋"}
                    </button>
                  </div>
                  <div className="waiting-info-row highlight">
                    <span className="waiting-label">Summa:</span>
                    <span className="waiting-value bold">{formatAmount(order?.amount)} so'm</span>
                  </div>
                </div>

                <div className="waiting-timer">
                  <span className="timer-icon-sm">⏱️</span>
                  <span>{formatTime(countdown)}</span>
                </div>

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

            {/* STARS SENT - SUCCESS */}
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
                      <button type="button" className="modal-copy-btn" onClick={() => navigator.clipboard.writeText(txId)}>
                        📋
                      </button>
                    </div>
                  </div>
                )}

                <p className="modal-auto-close">Oyna {timer}s da yopiladi</p>
              </div>
            )}

            {/* EXPIRED */}
            {status === "expired" && (
              <div className="modal-result-section">
                <button type="button" className="modal-close-x expired-x" onClick={() => setShowModal(false)}>✕</button>
                <div className="modal-result-icon expired-bg">⏰</div>
                <h3 className="modal-result-title">Vaqt tugadi</h3>
                <p className="modal-result-desc">To'lov muddati o'tib ketdi. Qaytadan urinib ko'ring.</p>
                <button type="button" className="btn-go-home" onClick={goToHome}>🏠 Bosh sahifaga qaytish</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
