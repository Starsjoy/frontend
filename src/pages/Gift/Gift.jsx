import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../../context/LanguageContext";
import apiFetch from "../../utils/apiFetch";
import { usePaymentCard } from "../../hooks/usePaymentCard";
import PaymentTransfer from "../../components/PaymentTransfer/PaymentTransfer";
import PaymentConfirm from "../../components/PaymentTransfer/PaymentConfirm";
import PaymentStatus from "../../components/PaymentTransfer/PaymentStatus";
import { toStage, resolvePolledStatus, polledStatusOf, isPaidStatus } from "../../components/PaymentTransfer/paymentStage";
import {
  isPaymeeInsufficientError,
  paymeeInsufficientAlertMessage,
} from "../../utils/paymeeErrors";
import { PaymeeStockAlert } from "../../components/PaymeeStockAlert";
import { TGSSticker } from "../../components/TGSSticker";
import WebApp from "@twa-dev/sdk";
import "./gift.css";
import "../../ui/ui.css";
import { TgStar, ChevronLeft } from "../../ui/Brand";


// Gift IDlar - har bir gift fayl nomi gift ID ga mos keladi (masalan: 5170145012310081615.tgs).
// Aksariyati animatsion .tgs stiker; agar ext:"jpg" (yoki boshqa rasm kengaytmasi) ko'rsatilsa,
// GiftVisual uni oddiy <img> sifatida ko'rsatadi (pastga qarang).
// `hidden: true` — katalogda ko'rsatilmaydi, lekin yozuvi SHU YERDA QOLADI:
// eski buyurtmalar tarixi rasmni chizish uchun shu ro'yxatdagi `ext` ga
// tayanadi (GIFT_EXT_BY_ID pastda butun ro'yxat bo'yicha quriladi).
// Qaytarish uchun `hidden: true` ni olib tashlash kifoya.
const GIFTS_RAW = [
  { id: "5170145012310081615", stars: 15 },
  { id: "5170233102089322756", stars: 15 }, // 🧸 eski mishka, Telegram katalogiga qaytdi
  { id: "5170250947678437525", stars: 25 },
  { id: "5168103777563050263", stars: 25 },
  { id: "5170144170496491616", stars: 50 },
  { id: "5170314324215857265", stars: 50 },
  { id: "5170564780938756245", stars: 50 },
  { id: "6028601630662853006", stars: 50 },
  { id: "5992502615223568003", stars: 50, hidden: true }, // 🎃🧸 Halloween ayiq — Telegram katalogidan olib tashlangan
  { id: "5922558454332916696", stars: 50, hidden: true }, // 🏆 G'olib kubogi
  { id: "5801108895304779062", stars: 50, hidden: true }, // 💍 Uzuk
  { id: "5800655655995968830", stars: 50, hidden: true }, // 🐻 Sevimli ayiqcha
  { id: "5956217000635139069", stars: 50, hidden: true }, // 💎 Olmos
  { id: "5893356958802511476", stars: 50, hidden: true }, // ⭐ Yulduz
  { id: "5935895822435615975", stars: 50, hidden: true }, // 👑 Toj
  { id: "5969796561943660080", stars: 50, hidden: true }, // 🐻 Ayiqcha Pro
  { id: "6046178578163303744", stars: 50, ext: "jpg", hidden: true }, // 😈 Terror ayiqcha
  { id: "5168043875654172773", stars: 100 },
  { id: "5170690322832818290", stars: 100 },
  { id: "5170521118301225164", stars: 100 },
];

// Narxlar (so'mda) - Backend bilan sinxronlashtirilgan
const PRICE_MAP = { 15: 5000, 25: 7000, 50: 13000, 100: 25000 };

/** Katalogda ko'rinadiganlar, arzonidan qimmatiga (eng arzoni tepada) */
const GIFTS = GIFTS_RAW.filter((g) => !g.hidden).sort((a, b) => {
  const diff = (PRICE_MAP[a.stars] ?? 0) - (PRICE_MAP[b.stars] ?? 0);
  if (diff !== 0) return diff;
  return a.stars - b.stars;
});

const GIFT_EXT_BY_ID = new Map(GIFTS_RAW.map((g) => [g.id, g.ext || "tgs"]));

const getGiftMediaPath = (giftId) => {
  const ext = GIFT_EXT_BY_ID.get(giftId) || "tgs";
  return new URL(`../../assets/${giftId}.${ext}`, import.meta.url).href;
};

/** .tgs bo'lsa animatsion stiker (TGSSticker), aks holda oddiy rasm sifatida ko'rsatadi. */
function GiftVisual({ giftId, className, autoplay, loop }) {
  if (!giftId) return null;
  const ext = GIFT_EXT_BY_ID.get(giftId) || "tgs";
  if (ext !== "tgs") {
    return <img src={getGiftMediaPath(giftId)} className={className} alt="" />;
  }
  return (
    <TGSSticker
      stickerPath={getGiftMediaPath(giftId)}
      className={className}
      autoplay={autoplay}
      loop={loop}
    />
  );
}

const MAX_COMMENT_LENGTH = 128;

const formatAmount = (num) => Number(num || 0).toLocaleString("ru-RU");
export default function Gift() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Karta serverdan keladi — admin switchi (UZCARD ⇄ HUMO) qayta build
  // qilmasdan darhol qo'llanadi. API ishlamasa eski VITE_ qiymatiga tushadi.
  const paymentCard = usePaymentCard();
  const CARD_NUMBER = paymentCard.display;
  const CARD_NAME = paymentCard.name;

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
  // Polling interval ichida eski closure emas, joriy status kerak
  const statusRef = useRef(status);
  statusRef.current = status;
  const [errorMessage, setErrorMessage] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [countdown, setCountdown] = useState(480);
  const [sending, setSending] = useState(false);
  const [paymeeStockModal, setPaymeeStockModal] = useState(null);

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
    
    const controller = new AbortController();
    
    const timeout = setTimeout(async () => {
      try {
        setLoadingProfile(true);
        const clean = username.startsWith("@") ? username.slice(1) : username;
        const res = await apiFetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: clean }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (res.ok) setProfile(data);
        else setProfile(null);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    }, 800);
    
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
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
      if (elapsed < 8 * 60 * 1000) {
        setOrder(parsed.order);
        setStatus(parsed.status || "payment_info");
        const remaining = Math.max(0, 480 - Math.floor(elapsed / 1000));
        setCountdown(remaining);
        startPolling(parsed.order);
        // Pul kelgan buyurtmada taymer qayta boshlanmaydi ("vaqt tugadi" chiqmasin)
        if (!isPaidStatus(parsed.status)) startCountdownTimer(remaining);
        if (["pending", "payment_info", "processing", "completed", "delayed"].includes(parsed.status)) {
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

        const polled = polledStatusOf(data); // yetkazish kechiksa — "delayed"
        // Pul kelgan bo'lsa 8 daqiqalik taymer to'xtaydi — to'lagan userga "vaqt tugadi" chiqmasin
        if (isPaidStatus(polled)) stopCountdown();
        const nextStatus = resolvePolledStatus(statusRef.current, polled);
        if (nextStatus !== statusRef.current) {
          statusRef.current = nextStatus;
          setStatus(nextStatus);
          const saved = localStorage.getItem("pendingGiftOrder");
          if (saved) {
            const p = JSON.parse(saved);
            p.status = nextStatus;
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
          if (["failed", "error"].includes(data.status)) {
            setErrorMessage(data.error_message || data.reason || data.error || "Kutilmagan xatolik yuz berdi.");
          }
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
        } else if (isPaymeeInsufficientError(newOrder)) {
          setPaymeeStockModal(paymeeInsufficientAlertMessage(newOrder, "gift"));
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
      startCountdownTimer(480); // 8 daqiqa
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
    <div className="sjp-root sjs-root">
      <div className="sjs-page has-bar">
        <button type="button" className="sjs-back sjs-back--float" onClick={() => navigate("/")} aria-label={t("ui.back")}>
          <ChevronLeft size={20} />
        </button>

        <header className="sjs-starhero sjg-hero sjg-hero--plain">
          <h1>Telegram Gifts</h1>
        </header>

        {/* KIMGA */}
        <section className="sjs-field">
          <label htmlFor="sjg-username">{t("ui.toWhom")}</label>
          <div className="sjs-inputrow">
            <input
              id="sjg-username"
              data-tour-id="tour-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
            {window?.Telegram?.WebApp && (
              <button type="button" className="sjs-mini" onClick={fillMyUsername}>
                {t("gift.me")}
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

        {/* SOVG'A TANLASH — faqat tanlangan stiker animatsiya qiladi */}
        <section className="sjs-field">
          <span className="sjs-label">{t("ui.selectGift")}</span>
          <div className="sjg-grid">
            {GIFTS.map((gift, index) => (
              <button
                key={gift.id}
                type="button"
                {...(index === 0 ? { "data-tour-id": "tour-gift-select" } : {})}
                className={`sjg-card ${selectedGift?.id === gift.id ? "is-active" : ""}`}
                onClick={() => handleGiftSelect(gift)}
              >
                <span className="sjg-card__art">
                  <GiftVisual
                    giftId={gift.id}
                    className="sjg-card__tgs"
                    autoplay={selectedGift?.id === gift.id}
                    loop={true}
                  />
                </span>
                <span className="sjg-card__stars"><TgStar size={13} /> {gift.stars}</span>
                <span className="sjg-card__price">{formatAmount(PRICE_MAP[gift.stars])} {t("common.currency")}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ANONIM */}
        <section className="sjs-field">
          <button
            type="button"
            className={`sjg-toggle ${isAnonymous ? "is-on" : ""}`}
            role="switch"
            aria-checked={isAnonymous}
            onClick={() => setIsAnonymous(!isAnonymous)}
          >
            <span className="sjg-toggle__text">
              <b>{t("ui.anonymous")}</b>
              {isAnonymous ? t("ui.anonOn") : t("ui.anonOff")}
            </span>
            <span className="sjg-toggle__sw" aria-hidden="true"><i /></span>
          </button>
        </section>

        {/* IZOH */}
        <section className="sjs-field">
          <label htmlFor="sjg-comment">{t("ui.comment")} <span className="sjg-opt">{t("ui.optional")}</span></label>
          <textarea
            id="sjg-comment"
            className="sjg-textarea"
            rows={3}
            value={comment}
            onChange={(e) => {
              if (e.target.value.length <= MAX_COMMENT_LENGTH) {
                setComment(e.target.value);
              }
            }}
            placeholder={t("ui.commentPlaceholder")}
          />
          <span className="sjg-count">{comment.length}/{MAX_COMMENT_LENGTH}</span>
        </section>

        {/* PROMOKOD */}
        <section className="sjs-field">
          <label htmlFor="sjg-promo">{t("ui.promo")} <span className="sjg-opt">{t("ui.optional")}</span></label>
          <div className="sjs-inputrow">
            <input
              id="sjg-promo"
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

        <p className="sjs-note">{t("ui.giftNote")}</p>

        {/* PASTKI PANEL — Jami + Sovg'a yuborish */}
        <div className="sjs-bar">
          <div className="sjs-bar__total">
            <span>{t("ui.total")}</span>
            <b>{formatAmount(appliedPromo ? appliedPromo.newPrice : giftPrice)} {t("common.currency")}</b>
          </div>
          <button
            type="button"
            className="sjs-cta"
            onClick={handleSend}
            disabled={sending || !profile || !selectedGift}
          >
            {sending ? t("ui.sending") : !profile ? t("ui.whoToSend") : t("ui.sendGift")}
          </button>
        </div>
      </div>

      {/* ============== XAVFSIZ TO'LOV (order yaratilgach) ============== */}
      {showWarningModal && order && (
        <PaymentConfirm
          amount={order.amount}
          product={t("transfer.giftLabel")}
          recipient={order.recipient_username}
          note={t("transfer.giftPrivacy")}
          onContinue={handleWarningUnderstood}
        />
      )}

      {/* ============== TO'LOV MA'LUMOTLARI (to'liq ekran) ============== */}
      {showModal && status === "payment_info" && order && (
        <PaymentTransfer
          cardDisplay={CARD_NUMBER}
          cardNumber={paymentCard.number}
          cardName={CARD_NAME}
          amount={order.amount}
          countdown={countdown}
          item="gift"
          onClose={() => { setShowModal(false); stopPolling(); stopCountdown(); }}
          onPaid={handlePaymentDone}
        />
      )}

      {/* ============== PAYMENT MODAL ============== */}
      {/* ============== TO'LOVDAN KEYINGI HOLATLAR ============== */}
      {showModal && order && toStage(status) && (
        <PaymentStatus
          stage={toStage(status)}
          item="gift"
          product={t("status.giftName")}
          productName={t("status.giftName")}
          badge="🎁"
          recipient={order.recipient_username}
          amount={order.amount}
          countdown={countdown}
          orderId={order.id}
          extraNote={toStage(status) === "failed" ? errorMessage || t("transfer.giftPrivacy") : ""}
          onClose={() => {
            setShowModal(false);
            stopPolling();
            stopCountdown();
            if (["failed", "error", "expired"].includes(status)) resetAll();
          }}
          onDone={resetAll}
          onRetry={resetAll}
        />
      )}

      {paymeeStockModal && (
        <PaymeeStockAlert
          product="gift"
          message={paymeeStockModal}
          onClose={() => setPaymeeStockModal(null)}
        />
      )}
    </div>
  );
}
