import React, { useEffect, useState, useRef } from "react";
import DelayNotice from "../../components/DelayNotice";
import { useNavigate } from "react-router-dom";
import apiFetch from "../../utils/apiFetch";
import { usePaymentCard } from "../../hooks/usePaymentCard";
import PaymentTransfer from "../../components/PaymentTransfer/PaymentTransfer";
import PaymentConfirm from "../../components/PaymentTransfer/PaymentConfirm";
import PaymentStatus from "../../components/PaymentTransfer/PaymentStatus";
import { toStage, resolvePolledStatus, polledStatusOf, isPaidStatus } from "../../components/PaymentTransfer/paymentStage";
import {
  getPremiumPurchasePath,
  isCardDeliveryVariant,
  starsApiPrefix,
} from "../../utils/starsPurchaseRoute";
import { useTranslation } from "../../context/LanguageContext";
import "./Stars.css";
import "../../ui/ui.css";
import { TgStar, ChevronDown, ChevronLeft } from "../../ui/Brand";
import StarBurst from "../../ui/StarBurst";

import WebApp from "@twa-dev/sdk";

// Bonus: har to'liq 50 Stars uchun +2 ⭐ (backend modules/rewards: stars_per_50)
const STARS_BONUS_PER_50 = 2;

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
  // Asosiy "Stars olish" tugmasi ekranda ko'rinmasa — pastda qotgan panel chiqadi
  const buyBtnRef = useRef(null);
  const [buyBtnVisible, setBuyBtnVisible] = useState(true);

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
          // Pul kelgan buyurtmada taymer qayta boshlanmaydi ("vaqt tugadi" chiqmasin)
          if (!isPaidStatus(parsed.status)) startCountdownTimer(remainingSec);

          // Agar status pending/payment_info bo'lsa, modalni ochamiz
          if (["payment_info", "pending", "payment_received", "processing", "delayed"].includes(parsed.status)) {
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

        const polled = polledStatusOf(data); // yetkazish kechiksa — "delayed"
        // Pul kelgan bo'lsa 8 daqiqalik taymer to'xtaydi — to'lagan userga "vaqt tugadi" chiqmasin
        if (isPaidStatus(polled)) stopCountdown();
        const nextStatus = resolvePolledStatus(statusRef.current, polled);
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

  // Asosiy tugmani kuzatish: ro'yxat ochilib tugma ekrandan chiqsa, pastki panel ko'rinadi
  useEffect(() => {
    const el = buyBtnRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([entry]) => setBuyBtnVisible(entry.isIntersecting), { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Yig'iq ro'yxat: dastlabki 3 ta + (tanlangan bo'lsa) tanlangan paket — tanlov ko'rinib tursin
  const visiblePlans = showMorePlans
    ? STARS_OPTIONS
    : STARS_OPTIONS.slice(0, 3).concat(
        STARS_OPTIONS.slice(3).filter((a) => String(a) === String(stars))
      );

  // Paket tanlash — ro'yxat ochiq qoladi; asosiy tugma ekrandan chiqib ketsa pastki panel ko'rinadi
  const selectPlan = (starAmount) => setStars(String(starAmount));

  const finalPrice = appliedPromo ? appliedPromo.newPrice : price;
  const starsNum = parseInt(stars, 10);
  // Narxga emas, miqdorga bog'liq: narx kechiksa/kelmasa ham panel chiqadi
  const stickyAmountOk = Number.isFinite(starsNum) && starsNum >= 50 && starsNum <= 10000;
  const showStickyBuy = stickyAmountOk && !buyBtnVisible && !showModal && !showWarningModal;

  // Paket qatori — chegirma bo'lsa /discount ga, aks holda tanlash (mantiq o'zgarmagan)
  const renderStarRow = (starAmount) => {
    const maxPrice = starAmount * NARX;
    const discountPkg = discountMap[starAmount];
    const stackCount = Math.min(STARS_OPTIONS.indexOf(starAmount) + 1, 6);
    const bonus = Math.floor(starAmount / 50) * STARS_BONUS_PER_50;
    const stack = (
      <span className="sjs-stack" aria-hidden="true">
        {Array.from({ length: stackCount }).map((_, i) => <TgStar key={i} size={26} outline />)}
      </span>
    );

    if (discountPkg) {
      return (
        <button
          key={starAmount}
          type="button"
          className="sjs-starrow sjs-starrow--discount"
          onClick={() => navigate('/discount', { state: { selectedPackageId: discountPkg.id } })}
        >
          {stack}
          <span className="sjs-starrow__n">{formatAmount(starAmount)} Stars</span>
          <span className="sjs-starrow__disc">-{discountPkg.discount}%</span>
          <span className="sjs-starrow__p">
            {formatAmount(discountPkg.discountedPrice)} {t("common.currency")}
            <s>{formatAmount(maxPrice)}</s>
          </span>
        </button>
      );
    }

    return (
      <button
        key={starAmount}
        type="button"
        className={`sjs-starrow ${stars === String(starAmount) ? "is-active" : ""}`}
        onClick={() => selectPlan(starAmount)}
      >
        {stack}
        <span className="sjs-starrow__n">{formatAmount(starAmount)} Stars</span>
        {bonus > 0 && <span className="sjs-starrow__bonus">+{bonus} <TgStar size={12} /></span>}
        <span className="sjs-starrow__p">{formatAmount(maxPrice)} {t("common.currency")}</span>
      </button>
    );
  };

  return (
    <div className="sjp-root sjs-root">
      <div className="sjs-page has-bar">
        <button type="button" className="sjs-back sjs-back--float" onClick={() => navigate("/")} aria-label={t("ui.back")}>
          <ChevronLeft size={20} />
        </button>

        <header className="sjs-starhero">
          <div className="sjs-starhero__art" aria-hidden="true">
            <StarBurst />
            <span className="sjs-starhero__star"><TgStar size={108} /></span>
          </div>
          <h1>Telegram Stars</h1>
        </header>

        <DelayNotice variant="inline" />

        {/* KIMGA */}
        <section className="sjs-field">
          <label htmlFor="sjs-username">{t("ui.toWhom")}</label>
          <div className="sjs-inputrow">
            <input
              id="sjs-username"
              data-tour-id="tour-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("stars.usernamePlaceholder")}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
            {window?.Telegram?.WebApp && (
              <button type="button" className="sjs-mini" onClick={fillMyUsername}>
                {t("common.me")}
              </button>
            )}
          </div>
          {loadingProfile && <div className="sjs-spin" />}
          {profile && (
            <div className="sjs-recipient">
              {profile.imageUrl ? (
                <img className="sjs-recipient__ph" src={profile.imageUrl} alt="" />
              ) : (
                <span className="sjs-recipient__ph">{(profile.fullName || profile.username || "?").charAt(0)}</span>
              )}
              <span>
                <b>{profile.fullName || profile.username}</b>@{profile.username}
              </span>
            </div>
          )}
        </section>

        {/* NECHTA STARS */}
        <section className="sjs-field">
          <label htmlFor="sjs-amount">{t("ui.howManyStars")}</label>
          <input
            id="sjs-amount"
            data-tour-id="tour-stars-amount"
            className="sjs-input"
            type="number"
            inputMode="numeric"
            value={stars}
            onChange={(e) => setStars(e.target.value)}
            placeholder={t("ui.amountRange")}
          />
        </section>

        {/* PAKETLAR */}
        <section className="sjs-field">
          <span className="sjs-label">{t("ui.selectAmount")}</span>
          <div className="sjs-starlist">
            {visiblePlans.map(renderStarRow)}
            {STARS_OPTIONS.length > 3 && (
              <button
                type="button"
                className={`sjs-starlist__toggle ${showMorePlans ? "is-open" : ""}`}
                aria-expanded={showMorePlans}
                onClick={() => setShowMorePlans(!showMorePlans)}
              >
                {showMorePlans ? t("ui.showLess") : t("ui.showMore")}
                <ChevronDown size={16} />
              </button>
            )}
          </div>
        </section>

        {/* PROMOKOD */}
        <section className="sjs-field">
          <label htmlFor="sjs-promo">{t("ui.promo")} <span className="sjg-opt">{t("ui.optional")}</span></label>
          <div className="sjs-inputrow">
            <input
              id="sjs-promo"
              value={pramacod}
              onChange={(e) => setPramacod(e.target.value)}
              placeholder={t("ui.promoPlaceholder")}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck="false"
            />
            <button type="button" className="sjs-mini" onClick={handleCheckPromo}>
              {t("common.check")}
            </button>
          </div>
          {promoMessage && (
            <p className={`sjs-promo-msg ${promoError ? "is-error" : "is-ok"}`}>{promoMessage}</p>
          )}
        </section>

        <p className="sjs-note">{t("ui.starsNote")}</p>

        {/* PASTKI PANEL — Jami + Stars olish */}
        <div className="sjs-bar">
          <div className={`sjs-bar__total ${priceLoading ? "is-loading" : ""}`}>
            <span>{t("ui.total")}</span>
            <b>{formatAmount(finalPrice || 0)} {t("common.currency")}</b>
          </div>
          <button
            ref={buyBtnRef}
            type="button"
            className={`sjs-cta ${stickyAmountOk ? "" : "is-dim"}`}
            data-tour-id="tour-stars-submit"
            onClick={handlePayment}
          >
            {t("stars.buyBtn")}
          </button>
        </div>
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