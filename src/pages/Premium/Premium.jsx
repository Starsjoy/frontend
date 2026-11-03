import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Premium.css";
import "../../ui/ui.css";
import { TgStar, ChevronLeft } from "../../ui/Brand";
import StarBurst from "../../ui/StarBurst";
import premiumStar from "../../ui/icons/star-tgpremium.svg"; // Telegram Premium gradienti
import WebApp from "@twa-dev/sdk";
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
// Bonus: har oy uchun +1 ⭐ (backend modules/rewards: premium_per_month)
const PREMIUM_BONUS_PER_MONTH = 1;

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
  // Ko'rsatiladigan narx: tanlangan paket uchun server narxi bo'lsa — o'sha, aks holda tarif narxi
  const planDisplayPrice = (p) =>
    isCardFlow && selectedPlan.id === p.id && fragmentPlanPrice != null ? fragmentPlanPrice : p.price;
  const totalPrice = appliedPromo?.new_price != null ? appliedPromo.new_price : planDisplayPrice(selectedPlan);

  return (
    <div className="sjp-root sjs-root sjs-root--premium">
      <div className="sjs-page has-bar">
        <button type="button" className="sjs-back sjs-back--float" onClick={() => navigate("/")} aria-label={t("ui.back")}>
          <ChevronLeft size={20} />
        </button>

        <header className="sjs-starhero sjs-starhero--premium">
          <div className="sjs-starhero__art" aria-hidden="true">
            <StarBurst src={premiumStar} />
            <span className="sjs-starhero__star"><img src={premiumStar} width="108" height="108" alt="" /></span>
          </div>
          <h1>Telegram Premium</h1>
        </header>

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
          {searchError && <p className="sjs-promo-msg is-error">{searchError}</p>}
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

        {/* MUDDAT */}
        <section className="sjs-field">
          <span className="sjs-label">{t("ui.selectDuration")}</span>
          <div className="sjs-plans" data-tour-id="tour-premium-plan">
            {plans.map((p) => {
              const shown = planDisplayPrice(p);
              const soldOut = isCardFlow && selectedPlan.id === p.id && fragmentSlotsFull;
              const perMonth = Math.round((Number(shown) || 0) / p.months / 100) * 100;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={selectedPlan.id === p.id}
                  className={`sjs-plan ${selectedPlan.id === p.id ? "is-active" : ""}`}
                  onClick={() => setSelectedPlan(p)}
                >
                  <span className="sjs-plan__radio" aria-hidden="true" />
                  <span className="sjs-plan__text">
                    <b>
                      {t(p.labelKey)}
                      <span className="sjs-starrow__bonus">+{p.months * PREMIUM_BONUS_PER_MONTH} <TgStar size={12} /></span>
                    </b>
                    {perMonth > 0 && (
                      <span>{t("ui.perMonth").replace("{price}", formatAmount(perMonth))}</span>
                    )}
                  </span>
                  <span
                    className="sjs-plan__price"
                    style={{ opacity: isCardFlow && selectedPlan.id === p.id && fragmentPriceLoading ? 0.55 : 1 }}
                  >
                    {soldOut ? t("premium.soldOut") : `${formatAmount(shown)} ${t("common.currency")}`}
                    {p.months === 12 && <em>{t("ui.bestValue")}</em>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* PROMOKOD */}
        <section className="sjs-field">
          <label htmlFor="sjs-promo">{t("ui.promo")} <span className="sjg-opt">{t("ui.optional")}</span></label>
          <div className="sjs-inputrow">
            <input
              id="sjs-promo"
              type="text"
              value={pramacod}
              onChange={(e) => setPramacod(e.target.value)}
              placeholder={t("ui.promoPlaceholder")}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck="false"
            />
            <button type="button" className="sjs-mini" onClick={handleCheckPromo}>
              {t("premium.promoApply")}
            </button>
          </div>
          {promoMessage && (
            <p className={`sjs-promo-msg ${promoError ? "is-error" : "is-ok"}`}>{promoMessage}</p>
          )}
        </section>

        <p className="sjs-note">{t("ui.premiumNote")}</p>

        {/* PASTKI PANEL — Jami + Premium olish */}
        <div className="sjs-bar">
          <div className={`sjs-bar__total ${fragmentPriceLoading ? "is-loading" : ""}`}>
            <span>{t("ui.total")}</span>
            <b>{formatAmount(totalPrice || 0)} {t("common.currency")}</b>
          </div>
          <button
            type="button"
            className="sjs-cta"
            data-tour-id="tour-premium-submit"
            disabled={loadingBuy}
            onClick={handleCreateOrder}
          >
            {loadingBuy ? t("premium.loadingBuy") : t("premium.buyBtn")}
          </button>
        </div>
      </div>

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
    </div>
  );
}