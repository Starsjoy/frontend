import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Premium.css";
import WebApp from "@twa-dev/sdk";
import premiumGif from "../../assets/premium_gif.gif";
import premiumSticker from "../../assets/AnimatedSticker_premium.tgs";
import { TGSSticker } from "../../components/TGSSticker";
import apiFetch from "../../utils/apiFetch";
import { usePaymentCard } from "../../hooks/usePaymentCard";
import PaymentTransfer from "../../components/PaymentTransfer/PaymentTransfer";
import PaymentConfirm from "../../components/PaymentTransfer/PaymentConfirm";
import PaymentStatus from "../../components/PaymentTransfer/PaymentStatus";
import { toStage, polledStatusOf } from "../../components/PaymentTransfer/paymentStage";
import {
  getFragmentPaymentLabel,
  isCardDeliveryVariant,
  premiumApiPrefix,
} from "../../utils/starsPurchaseRoute";
import { useTranslation } from "../../context/LanguageContext";
function normalizePremiumPollStatus(status) {
  if (status === "completed" || status === "delivered") return "premium_sent";
  return status;
}

export function PremiumPurchasePage({ variant = "fragment" }) {
  const { t } = useTranslation();
  const isFragment = variant === "fragment";
  const isPaymee = variant === "paymee";
  const isCardFlow = isCardDeliveryVariant(variant);
  const premiumApi = premiumApiPrefix(variant);
  const navigate = useNavigate();
  const PREMIUM_3 = parseInt(import.meta.env.VITE_PREMIUM_3);
  const PREMIUM_6 = parseInt(import.meta.env.VITE_PREMIUM_6);
  const PREMIUM_12 = parseInt(import.meta.env.VITE_PREMIUM_12);
  // Karta serverdan keladi — admin switchi (UZCARD ⇄ HUMO) qayta build
  // qilmasdan darhol qo'llanadi. API ishlamasa eski VITE_ qiymatiga tushadi.
  const paymentCard = usePaymentCard();
  const CARD_NUMBER = paymentCard.display;
  const CARD_NAME = paymentCard.name;

  // ====================
  // STATE
  // ====================
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const plans = [
    { id: 1, labelKey: "premium.months3", price: PREMIUM_3, months: 3 },
    { id: 2, labelKey: "premium.months6", price: PREMIUM_6, months: 6 },
    { id: 3, labelKey: "premium.months12", price: PREMIUM_12, months: 12 },
  ];

  const [selectedPlan, setSelectedPlan] = useState(plans[0]);
  const [order, setOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [cardLast4, setCardLast4] = useState("");

  const countdownRef = useRef(null);
  const pollingRef = useRef(null);
  /** Server yangi buyurtmani ham `pending` deb qaytaradi; UI esa "To'lov qildim" bosilguncha payment_info ko'rinishida qolishi kerak */
  const paymentDoneClickedRef = useRef(false);
  const [countdown, setCountdown] = useState(0);

  const [loadingBuy, setLoadingBuy] = useState(false);

  // Promocode states
  const [pramacod, setPramacod] = useState("");
  const [promoMessage, setPromoMessage] = useState("");
  const [promoError, setPromoError] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [fragmentPayLabel, setFragmentPayLabel] = useState("");
  const [fragmentPlanPrice, setFragmentPlanPrice] = useState(null);
  const [fragmentPriceLoading, setFragmentPriceLoading] = useState(false);
  const [fragmentSlotsFull, setFragmentSlotsFull] = useState(false);

  // Format
  const formatAmount = (num) =>
    num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  // Back button functionality
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

    return () => {
      try {
        if (!showModal && !showWarningModal) {
          WebApp.BackButton.offClick(handleBack);
          WebApp.BackButton.hide();
        }
      } catch (e) {}
    };
  }, [showModal, showWarningModal, navigate]);

  useEffect(() => {
    if (!isCardFlow) {
      setFragmentPayLabel("");
      return;
    }
    if (isPaymee) {
      setFragmentPayLabel("Paymee API");
      return;
    }
    apiFetch("/api/app-config")
      .then((r) => r.json())
      .then((cfg) => setFragmentPayLabel(getFragmentPaymentLabel(cfg)))
      .catch(() => setFragmentPayLabel("TON"));
  }, [isCardFlow, isPaymee]);

  // Fragment: slot narxi backenddan (to'lov summasi mos bo'lishi uchun)
  useEffect(() => {
    if (!isCardFlow) {
      setFragmentPlanPrice(null);
      setFragmentSlotsFull(false);
      return;
    }

    setFragmentPriceLoading(true);
    apiFetch(`${premiumApi}/price/${selectedPlan.months}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.available && data.price) {
          setFragmentPlanPrice(data.price);
          setFragmentSlotsFull(false);
        } else {
          setFragmentPlanPrice(null);
          setFragmentSlotsFull(false);
        }
      })
      .catch(() => {
        setFragmentPlanPrice(null);
        setFragmentSlotsFull(false);
      })
      .finally(() => setFragmentPriceLoading(false));
  }, [isCardFlow, selectedPlan.months, premiumApi]);

  // ================================
  // 🔍 PREMIUM SEARCH
  // ================================
  useEffect(() => {
    if (!username) {
      setProfile(null);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();

    const delay = setTimeout(async () => {
      try {
        setLoadingProfile(true);

        const clean = username.replace("@", "");

        if (isFragment) {
          if (/^[a-zA-Z0-9_]{4,32}$/.test(clean)) {
            setProfile({ username: clean, recipient: clean, fullName: clean });
            setSearchError(null);
          } else {
            setProfile(null);
            setSearchError("Username noto'g'ri");
          }
          return;
        }

        const searchUrl = isPaymee ? `${premiumApi}/search` : "/api/premium/search";
        const res = await apiFetch(searchUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: clean,
            months: selectedPlan.months,
          }),
          signal: controller.signal,
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
          recipient: data.recipient,
        });

        setSearchError(null);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setSearchError("Tarmoq xatosi");
        setProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    }, isFragment ? 300 : 500);

    return () => {
      clearTimeout(delay);
      controller.abort();
    };
  }, [username, selectedPlan, isFragment, isPaymee, premiumApi]);

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
  const handleCheckPromo = async () => {
    if (!pramacod) {
      setPromoMessage("Pramacod kiriting");
      setPromoError(true);
      return;
    }
    try {
      setPromoMessage("Tekshirilmoqda...");
      setPromoError(false);

      const res = await apiFetch("/api/promocode/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          code: pramacod, 
          type: "premium", 
          amount: selectedPlan.months,
          price: selectedPlan.price
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoMessage(data.error || "Pramacod xato");
        setPromoError(true);
        setAppliedPromo(null);
      } else {
        setPromoMessage(`Muvaffaqiyatli! Chegirma: ${data.discount_percent}%`);
        setPromoError(false);
        setAppliedPromo({
          code: pramacod,
          discount_percent: data.discount_percent,
          new_price: data.new_price
        });
      }
    } catch (err) {
      setPromoMessage("Xatolik yuz berdi");
      setPromoError(true);
      setAppliedPromo(null);
    }
  };

  const handleCreateOrder = async () => {

    const cleanUsername = (profile?.username || username || "").replace(/^@/, "").trim();
    if (!cleanUsername) {
      alert("Iltimos, username kiriting!");
      return;
    }

    if (!isCardFlow && (!profile?.username || !profile?.recipient)) {
      alert("Foydalanuvchi topilmadi!");
      return;
    }

    if (isCardFlow && fragmentSlotsFull) {
      alert("⏳ Hozirda juda ko'p buyurtmalar mavjud.\n\nIltimos, 1-2 daqiqadan keyin qayta urinib ko'ring.");
      return;
    }

    setLoadingBuy(true);

    try {
      const orderBody = isCardFlow
        ? {
            username: cleanUsername,
            months: selectedPlan.months,
            applied_promocode: appliedPromo?.code || null,
            ...(isPaymee && fragmentPlanPrice ? { slot_price: fragmentPlanPrice } : {}),
            ...(isPaymee && appliedPromo?.new_price != null
              ? { final_amount: appliedPromo.new_price }
              : {}),
          }
        : {
            username: profile.username,
            recipient: profile.recipient,
            months: selectedPlan.months,
            applied_promocode: appliedPromo?.code || null,
          };

      const res = await apiFetch(isCardFlow ? `${premiumApi}/order` : "/api/premium", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderBody),
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

      const orderData = data.order || data;
      setOrder(orderData);
      paymentDoneClickedRef.current = false;
      setShowWarningModal(true);
      setPaymentStatus("payment_info");
      setCardLast4("");

      startCountdown(480); // 8 daqiqa
      startPolling(orderData.id);

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
        const pollUrl = isCardFlow
          ? `${premiumApi}/transactions/${id}`
          : `/api/premium/transactions/${id}`;
        const res = await apiFetch(pollUrl);
        const data = await res.json();

        if (!res.ok) return;

        // Yetkazish kechiksa (delayed) — "admin tez orada yuboradi" ekrani
        let serverStatus = normalizePremiumPollStatus(polledStatusOf(data));

        setCardLast4(data.card_last4 || "");

        const holdPaymentInfoScreen =
          serverStatus === "pending" && !paymentDoneClickedRef.current;

        if (!holdPaymentInfoScreen) {
          setPaymentStatus(serverStatus);
        }

        // Natija ekranlari (muvaffaqiyat / jarayon / xato) — modal yopiq yoki warning ustida bo'lsa ham ko'rinsin
        const visibleResultStatuses = [
          "premium_sent",
          "payment_received",
          "processing",
          "delayed",
          "failed",
          "error",
          "expired",
        ];
        if (visibleResultStatuses.includes(serverStatus)) {
          setShowWarningModal(false);
          setShowModal(true);
        }

        // To'lov / natija bosqichiga o'tilganda taymerni to'xtatish — aks holda vaqt tugaganda modal yopilib "expired" bo'ladi
        if (
          [
            "processing",
            "payment_received",
            "delayed",
            "premium_sent",
            "failed",
            "error",
            "expired",
          ].includes(serverStatus)
        ) {
          stopCountdown();
        }

        // Premium yuborildi - muvaffaqiyatli
        if (serverStatus === "premium_sent") {
          stopPolling();
          // Auto-yopish timer
          setTimeout(() => setShowModal(false), 15000);
        }

        // Xatolik
        if (["failed", "error"].includes(serverStatus)) {
          stopPolling();
          setErrorMessage(data.error_message || data.reason || data.error || "Kutilmagan xatolik yuz berdi. Iltimos, admin bilan bog'laning.");
        }

        if (serverStatus === "expired") {
          stopPolling();
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

  // "To'lov qildim" tugmasi - payment_info dan pending ga o'tish
  const handlePaymentDone = () => {
    paymentDoneClickedRef.current = true;
    setPaymentStatus("pending");
  };

  // "Tushundim" tugmasi - warning modaldan payment modalga o'tish
  const handleWarningUnderstood = () => {
    setShowWarningModal(false);
    setShowModal(true);
  };

  // ================================
  // UI
  // ================================
  return (
    <div className="premium-container">
      <div className="premium-header-container">
        <TGSSticker stickerPath={premiumSticker} className="premium-header-sticker" />
      </div>

      <div className="premium-page-title">
        <h1>Telegram Premium</h1>
        <p>
          {t("premium.purchase")}
          {isCardFlow && fragmentPayLabel
            ? isPaymee
              ? ` · ${fragmentPayLabel}`
              : ` · Fragment (${fragmentPayLabel})`
            : ""}
        </p>
      </div>

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
            <button
              type="button"
              className="btn-my"
              onClick={fillMyUsername}
            >
              {t("common.me")}
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

      {/* avto fragment orqali */}
      <h3>{t("premium.auto")}</h3>

      <div className="plans" data-tour-id="tour-premium-plan">
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
              <span>{t(p.labelKey)}</span>
              <span style={{ opacity: isCardFlow && selectedPlan.id === p.id && fragmentPriceLoading ? 0.55 : 1, transition: "opacity 0.2s ease" }}>
                {/* Server narxi kelmasa (tarmoq/limit xatosi) — "—" emas, tarifning odatdagi narxi.
                    Aniq to'lov summasi baribir buyurtma ochilganda beriladi. */}
                {isCardFlow && selectedPlan.id === p.id && fragmentSlotsFull
                  ? t("premium.soldOut")
                  : isCardFlow && selectedPlan.id === p.id && fragmentPlanPrice != null
                    ? `${formatAmount(fragmentPlanPrice)} ${t("common.currency")}`
                    : `${formatAmount(p.price)} ${t("common.currency")}`}
              </span>
            </div>
            <span style={{ marginLeft: "auto", fontSize: "13px", color: "#0088cc", fontWeight: "600" }}>({t("premium.auto").replace(":", "")})</span>
          </label>
        ))}
      </div>

      <div className="actions" style={{ marginTop: "25px", marginBottom: "15px" }}>
        <button
          data-tour-id="tour-premium-submit"
          disabled={loadingBuy}
          onClick={handleCreateOrder}
        >
          {loadingBuy ? t("premium.loadingBuy") : t("premium.buyBtn")}
        </button>
      </div>

      <div className="promo-input-group" style={{ marginBottom: "15px" }}>
        <input
          type="text"
          placeholder={t("premium.promoPlaceholder")}
          value={pramacod}
          onChange={(e) => setPramacod(e.target.value)}
          style={{ width: "calc(100% - 100px)", padding: "12px", borderRadius: "14px", border: "1px solid #ccc", outline: "none", fontSize: "16px", marginRight: "10px" }}
        />
        <button className="btn-my" onClick={handleCheckPromo} style={{ width: "90px", padding: "12px", borderRadius: "14px", border: "none", cursor: "pointer", background: "var(--tg-theme-button-color, #2481cc)", color: "white", fontSize: "14px" }}>{t("premium.promoApply")}</button>
      </div>
      {promoMessage && (
        <div style={{ color: promoError ? 'red' : 'green', fontSize: '14px', marginBottom: '15px', textAlign: 'center' }}>
          {promoMessage}
        </div>
      )}



      {/* XAVFSIZ TO'LOV (order yaratilgach) */}
      {showWarningModal && order && (
        <PaymentConfirm
          amount={order.amount}
          product={t("transfer.premiumMonths").replace("{n}", order.muddat_oy)}
          recipient={profile?.username || username}
          onContinue={handleWarningUnderstood}
        />
      )}

      {/* TO'LOV MA'LUMOTLARI (to'liq ekran) */}
      {showModal && order && paymentStatus === "payment_info" && (
        <PaymentTransfer
          cardDisplay={CARD_NUMBER}
          cardNumber={paymentCard.number}
          cardName={CARD_NAME}
          amount={order.amount}
          countdown={countdown}
          item="premium"
          onClose={() => { stopPolling(); stopCountdown(); setShowModal(false); }}
          onPaid={handlePaymentDone}
        />
      )}

      {/* MODAL */}
      {/* TO'LOVDAN KEYINGI HOLATLAR */}
      {showModal && order && toStage(paymentStatus) && (
        <PaymentStatus
          stage={toStage(paymentStatus)}
          item="premium"
          product={t("transfer.premiumMonths").replace("{n}", order.muddat_oy)}
          productName="Premium"
          badge={`💎 ${order.muddat_oy}`}
          recipient={profile?.username || username}
          amount={order.amount}
          countdown={countdown}
          orderId={order.id}
          extraNote={
            toStage(paymentStatus) === "failed"
              ? errorMessage
              : toStage(paymentStatus) === "pending" && cardLast4
                ? t("status.cardDetected").replace("{last4}", cardLast4)
                : ""
          }
          onClose={() => {
            stopPolling();
            stopCountdown();
            setShowModal(false);
            if (["failed", "error", "expired"].includes(paymentStatus)) setPaymentStatus("idle");
          }}
          onDone={() => { setShowModal(false); stopPolling(); stopCountdown(); }}
          onRetry={() => { setShowModal(false); setPaymentStatus("idle"); }}
        />
      )}

      {/* NAVIGATION */}
      {/* <div className="btn-container">
        <button className="btn-nav" onClick={() => navigate("/")}>⬅️Orqaga</button>
        <button className="btn-nav" onClick={() => navigate("/stars")}>Stars</button>
      </div> */}

    </div>
  );
}