import React, { useEffect, useState, useRef } from "react";
import starsSticker from "../../assets/AnimatedSticker_stars.tgs";
import { TGSSticker } from "../../components/TGSSticker";
import { useNavigate } from "react-router-dom";
import apiFetch from "../../utils/apiFetch";
import { usePaymentCard } from "../../hooks/usePaymentCard";
import PaymentTransfer from "../../components/PaymentTransfer/PaymentTransfer";
import PaymentConfirm from "../../components/PaymentTransfer/PaymentConfirm";
import PaymentStatus from "../../components/PaymentTransfer/PaymentStatus";
import { toStage, resolvePolledStatus } from "../../components/PaymentTransfer/paymentStage";
import {
  getPremiumPurchasePath,
  isCardDeliveryVariant,
  starsApiPrefix,
} from "../../utils/starsPurchaseRoute";
import { useTranslation } from "../../context/LanguageContext";
import "./Stars.css";

import WebApp from "@twa-dev/sdk";

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

// 8 daqiqa = 480 sekund
const POLLING_DURATION = 8 * 60 * 1000; // 8 daqiqa millisekondda

export function StarsPurchasePage({ variant = "fragment" }) {
  const { t } = useTranslation();
  const isFragment = variant === "fragment";
  const isPaymee = variant === "paymee";
  const isCardFlow = isCardDeliveryVariant(variant);
  const starsApi = starsApiPrefix(variant);
  // Karta serverdan keladi — admin switchi (UZCARD ⇄ HUMO) qayta build
  // qilmasdan darhol qo'llanadi. API ishlamasa eski VITE_ qiymatiga tushadi.
  const paymentCard = usePaymentCard();
  const CARD_NUMBER = paymentCard.display;
  const CARD_NAME = paymentCard.name;
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
  // Polling interval ichida eski closure emas, joriy status kerak
  const statusRef = useRef(status);
  statusRef.current = status;
  const [errorMessage, setErrorMessage] = useState("");
  const [txId, setTxId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [timer, setTimer] = useState(20);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [countdown, setCountdown] = useState(480); // 8 daqiqa
  const [showMorePlans, setShowMorePlans] = useState(false);

  // Promocode state
  const [pramacod, setPramacod] = useState("");
  const [promoMessage, setPromoMessage] = useState("");
  const [promoError, setPromoError] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState(null);

  // Refs for polling
  const pollingRef = useRef(null);
  const countdownRef = useRef(null);

  const navigate = useNavigate();

  const goToPremium = async () => {
    setShowModal(false);
    try {
      const res = await apiFetch("/api/app-config");
      const cfg = await res.json();
      navigate(getPremiumPurchasePath(cfg));
    } catch {
      navigate(
        isPaymee ? "/paymeepremium" : "/premium"
      );
    }
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

  // Discount paketlarni yuklash (refreshable)
  const fetchDiscountPackages = async () => {
    try {
      const res = await apiFetch("/api/discount-packages");
      const data = await res.json();
      const map = {};
      data.forEach(pkg => {
        if (pkg.slot_available !== false) {
          map[pkg.stars] = {
            id: pkg.id,
            discount: pkg.discount_percent,
            discountedPrice: pkg.current_price,
            basePrice: pkg.stars * NARX,
          };
        }
      });
      setDiscountMap(map);
      console.log("✅ Discount map:", map);
    } catch (err) {
      console.error("❌ Discount paketlarni yuklashda xato:", err);
    }
  };

  // Backend status
  useEffect(() => {
    const handleBack = () => {
      if (showModal) {
        setShowModal(false);
      } else if (showWarningModal) {
        setShowWarningModal(false);
      } else {
        navigate("/");
      }
    };

    try {
      WebApp.ready();
      WebApp.BackButton.show();
      WebApp.BackButton.onClick(handleBack);
    } catch (e) {
      console.warn("Telegram WebApp not ready", e);
    }

    apiFetch("/api/status")
      .then((res) => res.json())
      .then((data) => setBackendStatus(data.message))
      .catch(() => setBackendStatus("Backend offline ❌"));

    return () => {
      try {
        if (!showModal && !showWarningModal) {
          WebApp.BackButton.offClick(handleBack);
          WebApp.BackButton.hide();
        }
      } catch (e) {}
    };
  }, [showModal, showWarningModal, navigate]);

  // Discount paketlarni yuklash (initial load)
  useEffect(() => {
    fetchDiscountPackages();
  }, []);

  // Stars price - backend dan slot-based narx olish
  useEffect(() => {
    // Reset promo when stars change
    setAppliedPromo(null);
    setPromoMessage("");
    
    if (!stars || parseInt(stars) < 50 || parseInt(stars) > 10000) {
      setPrice(0);
      return;
    }
    
    const starNum = parseInt(stars);
    setPriceLoading(true);
    
    // Slot-based narx - backend dan olish
    apiFetch(isCardFlow ? `${starsApi}/price/${starNum}` : `/api/stars/price/${starNum}`)
      .then(res => res.json())
      .then(data => {
        if (data.available && data.price) {
          setPrice(data.price);
        } else {
          setPrice(0);
        }
      })
      .catch(() => {
        // Xato bo'lsa fallback
        setPrice(starNum * NARX);
      })
      .finally(() => setPriceLoading(false));
  }, [stars, isCardFlow, starsApi]);

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

  // Profil: RobynHood API yoki Fragment (faqat username)
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

        if (isFragment) {
          if (/^[a-zA-Z0-9_]{4,32}$/.test(cleanUsername)) {
            setProfile({ username: cleanUsername, recipient: cleanUsername });
          } else {
            setProfile(null);
          }
          return;
        }

        const starNum = parseInt(stars, 10);
        const searchUrl = isPaymee
          ? `${starsApi}/search`
          : "/api/search";
        const searchBody = isPaymee
          ? { username: cleanUsername, stars: Number.isInteger(starNum) ? starNum : 50 }
          : { username: cleanUsername };

        const profileRes = await apiFetch(searchUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(searchBody),
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
    }, isFragment ? 300 : 1000);

    return () => clearTimeout(timeout);
  }, [username, isFragment, isPaymee, stars, starsApi]);

  // Check promocode
  const handleCheckPromo = async () => {
    if (!pramacod) return;
    setPromoMessage("");
    if (!stars) {
      setPromoError(true);
      setPromoMessage("Avval stars miqdorini tanlang");
      return;
    }
    try {
      const res = await apiFetch("/api/promocode/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: pramacod,
          type: "stars",
          amount: stars,
          price: price, // oyna uchun ko'rsatish
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

        // 8 daqiqa o'tmagan bo'lsa, polling davom etadi
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
          // 8 daqiqa o'tgan, buyurtmani o'chiramiz
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

        const nextStatus = resolvePolledStatus(statusRef.current, data.status);
        if (nextStatus !== statusRef.current) {
          statusRef.current = nextStatus;
          setStatus(nextStatus);

          // LocalStorage ni yangilaymiz
          const saved = localStorage.getItem("pendingStarsOrder");
          if (saved) {
            const parsed = JSON.parse(saved);
            parsed.status = nextStatus;
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
          if (data.status === "failed" || data.status === "error") {
            setErrorMessage(data.error_message || data.reason || data.error || "Kutilmagan xatolik yuz berdi. Iltimos, admin bilan bog'laning.");
          }
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

  // Countdown timer (8 daqiqa)
  const startCountdownTimer = (initialSeconds = 480) => {
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

    const cleanUsername = (profile?.username || username || "")
      .replace(/^@/, "")
      .trim();

    if (!cleanUsername) {
      alert("Iltimos, username kiriting!");
      return;
    }

    if (!isCardFlow && (!profile || !profile.recipient)) {
      alert("Foydalanuvchi topilmadi!");
      return;
    }

    try {
      const payload = isCardFlow
        ? {
            username: cleanUsername,
            stars: parseInt(stars, 10),
            ...(isPaymee && price > 0 ? { slot_price: price } : {}),
            ...(isPaymee && appliedPromo?.newPrice != null
              ? { final_amount: appliedPromo.newPrice }
              : {}),
          }
        : {
            username: profile.username,
            recipient: profile.recipient,
            stars: parseInt(stars, 10),
          };

      if (appliedPromo) {
        payload.applied_promocode = appliedPromo.code;
      }

      const res = await apiFetch(isCardFlow ? `${starsApi}/order` : "/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      startCountdownTimer(480); // 8 daqiqa
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

  return (
    <div className="stars-container">
      <div className="stars-header-container">
        <TGSSticker stickerPath={starsSticker} className="stars-header-sticker" />
      </div>

      <div className="stars-page-title">
        <h1>Telegram Stars</h1>
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
            data-tour-id="tour-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t("stars.usernamePlaceholder")}
          />
          {window?.Telegram?.WebApp && (
            <button type="button" className="btn-my" onClick={fillMyUsername}>
              {t("common.me")}
            </button>
          )}
        </div>
      </div>

      <h3>{t("stars.enterAmountLabel")}</h3>
      <div className="input-group">
        <input
          data-tour-id="tour-stars-amount"
          className="tg-input"
          type="number"
          value={stars}
          onChange={(e) => setStars(e.target.value)}
          placeholder={t("stars.amountPlaceholder")}
        />
      </div>

      {/* Stars Options */}
      <div className="preset-options-section">
        <h3 style={{color: '#fff', margin: '24px 0 12px 0', fontSize: '16px', fontWeight: '600'}}>{t("stars.orSelectPack")}</h3>
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
              {showMorePlans ? `${t("stars.hidePlans")} ▲` : `${t("stars.showMorePlans")} ▼`}
            </button>
          </div>
        )}
      </div>

      <div className="actions" style={{ marginBottom: '20px' }}>
        <button
          type="button"
          className="tg-button"
          data-tour-id="tour-stars-submit"
          onClick={handlePayment}
        >
          {t("stars.buyBtn")} {price > 0 && `- ${formatAmount(appliedPromo ? appliedPromo.newPrice : price)} ${t("common.currency")}`}
        </button>
      </div>

      <div className="pramacod" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            value={pramacod}
            onChange={(e) => setPramacod(e.target.value)}
            style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff' }}
            placeholder={t("stars.promoPlaceholder")}
          />
          <button
            type="button"
            onClick={handleCheckPromo}
            style={{ padding: '0 16px', borderRadius: '10px', background: '#e58f0d', color: '#fff', border: 'none', fontWeight: 'bold' }}
          >
            {t("common.check")}
          </button>
        </div>
        {promoMessage && (
          <div style={{ fontSize: '13px', color: promoError ? '#ff4d4d' : '#00e676', textAlign: 'left', paddingLeft: '5px' }}>
            {promoMessage}
          </div>
        )}
      </div>

      {/* ---------------- XAVFSIZ TO'LOV (order yaratilgach) ---------------- */}
      {showWarningModal && order && (
        <PaymentConfirm
          amount={order.amount}
          product={`${order.stars} Stars`}
          recipient={profile?.username || username}
          onContinue={handleWarningUnderstood}
        />
      )}

      {/* ---------------- TO'LOV MA'LUMOTLARI (to'liq ekran) ---------------- */}
      {showModal && status === "payment_info" && order && (
        <PaymentTransfer
          cardDisplay={CARD_NUMBER}
          cardNumber={paymentCard.number}
          cardName={CARD_NAME}
          amount={order.amount}
          countdown={countdown}
          item="stars"
          onClose={() => { setShowModal(false); stopPolling(); stopCountdown(); }}
          onPaid={handlePaymentDone}
        />
      )}

      {/* ---------------- TO'LOVDAN KEYINGI HOLATLAR ---------------- */}
      {showModal && order && toStage(status) && (
        <PaymentStatus
          stage={toStage(status)}
          item="stars"
          product={`${order.stars} Stars`}
          productName="Stars"
          badge={`${order.stars} ⭐`}
          recipient={profile?.username || username}
          amount={order.amount}
          countdown={countdown}
          txId={txId}
          orderId={order.id}
          autoClose={timer}
          extraNote={toStage(status) === "failed" ? errorMessage : ""}
          onClose={() => { setShowModal(false); stopPolling(); stopCountdown(); }}
          onDone={() => setShowModal(false)}
          onRetry={() => setShowModal(false)}
        />
      )}
    </div>
  );
}