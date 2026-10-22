import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "../../context/LanguageContext";
import { Countdown } from "./PaymentTransfer";
import "./PaymentTransfer.css";

/**
 * To'lovdan keyingi holatlar — Stars, Premium, Gift va Discount uchun umumiy.
 * "To'lov qildim" bosilgandan keyin PaymentTransfer o'rnida chiqadi.
 *
 *   pending  — to'lov tekshirilmoqda (taymer bilan)
 *   received — to'lov qabul qilindi, mahsulot yuborilmoqda
 *   success  — yetkazildi (yulduzli "ikki to'lqin" animatsiyasi)
 *   failed   — pul keldi, lekin yuborishda xato (sariq)
 *   expired  — 8 daqiqada to'lov kelmadi (qizil, taymer 00:00)
 *
 * Sahifalar o'z statuslarini (stars_sent, premium_sent, gift_sent, ...) shu
 * beshtasiga moslab beradi; handler'lar sahifaning o'zinikidir.
 */

const SUPPORT_URL = "https://t.me/StarsjoySupport";


const formatAmount = (num) =>
  num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// "**qalin**" belgilarini <b> ga aylantiradi
function rich(text) {
  return text.split("**").map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part));
}

const StarIcon = ({ size = 30 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M12 2.8l2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 16.84 6.5 19.72l1.05-6.12L3.1 9.27l6.15-.9z" />
  </svg>
);

const CheckIcon = ({ size = 15 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12h14M13 6l6 6-6 6" />
  </svg>
);

// "Ikki to'lqin": har bir yulduz o'z burchagi va masofasiga boradi
const SCATTER = [
  { a: 12, r: 72, s: 14, w: 1 },
  { a: 64, r: 96, s: 11, w: 1 },
  { a: 118, r: 68, s: 13, w: 1 },
  { a: 171, r: 104, s: 10, w: 1 },
  { a: 226, r: 78, s: 15, w: 1 },
  { a: 283, r: 92, s: 12, w: 1 },
  { a: 333, r: 66, s: 11, w: 1 },
  { a: 38, r: 122, s: 10, w: 2 },
  { a: 92, r: 134, s: 13, w: 2 },
  { a: 147, r: 116, s: 11, w: 2 },
  { a: 198, r: 138, s: 9, w: 2 },
  { a: 249, r: 120, s: 12, w: 2 },
  { a: 304, r: 130, s: 10, w: 2 },
  { a: 356, r: 112, s: 13, w: 2 },
];

function HeroIcon({ stage }) {
  if (stage === "success") {
    return (
      <div className="ps-hero-icon ps-hero-icon--success fx-pop fx-glow">
        <span className="fx-flash" />
        {SCATTER.map((st, i) => (
          <span
            key={i}
            className="fx-star"
            style={{ "--a": `${st.a}deg`, "--r": `${st.r}px`, "--d": `${st.w === 1 ? 250 + i * 25 : 700 + i * 25}ms` }}
          >
            <StarIcon size={st.s} />
          </span>
        ))}
        <svg className="fx-check" viewBox="0 0 52 52"><path d="M15 27l7.5 7.5L38 19" /></svg>
      </div>
    );
  }
  if (stage === "failed") {
    return (
      <div className="ps-hero-icon ps-hero-icon--failed">
        <span className="ps-signal" />
        <span className="ps-signal ps-signal--b" />
        <span className="ps-signal ps-signal--c" />
        <span className="ps-hero-bang">!</span>
      </div>
    );
  }
  if (stage === "expired") {
    return (
      <div className="ps-hero-icon ps-hero-icon--expired">
        <svg className="fx-clock" viewBox="0 0 48 48" width="52" height="52" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <circle cx="24" cy="24" r="19" />
          <path className="fx-clock-min" d="M24 24V10" />
          <path className="fx-clock-hour" d="M24 24h8" />
        </svg>
      </div>
    );
  }
  if (stage === "received") {
    return (
      <div className="ps-hero-icon ps-hero-icon--received">
        <span className="ps-hero-pulse" />
        <span className="ps-hero-pulse ps-hero-pulse--late" />
        <StarIcon size={34} />
      </div>
    );
  }
  return (
    <div className="ps-hero-icon ps-hero-icon--pending">
      <span className="ps-hero-ring" />
      <StarIcon size={34} />
    </div>
  );
}

const CALLOUT_ICON = {
  pending: <span className="ps-callout-spin" />,
  received: <span className="ps-callout-send"><SendIcon /></span>,
  success: <CheckIcon />,
  failed: <b className="ps-callout-bang">!</b>,
  expired: <ClockIcon />,
};

export default function PaymentStatus({
  stage,
  item = "stars",     // "stars" | "premium" | "gift" — xato matnidagi nom
  product,            // "100 Stars", "Premium · 3 oy", "Sovg'a"
  productName,        // sarlavha uchun: "Stars", "Premium", "Sovg'a"
  badge,              // summa yonida: "100 ⭐", "💎 3 oy", "🎁"
  recipient,
  amount,
  countdown,
  txId,
  orderId,
  autoClose,          // muvaffaqiyatda: necha soniyada yopiladi (bo'lmasa ko'rsatilmaydi)
  extraNote,          // qo'shimcha izoh (Premium: aniqlangan karta, Gift: maxfiylik)
  onClose,
  onDone,
  onRetry,
  embedded = false,   // /test sahifasidagi ramka uchun: portal va scroll-lock'siz
}) {
  const { t } = useTranslation();
  const user = (recipient || "").replace(/^@/, "").trim();
  const amountText = `${formatAmount(amount)} ${t("common.currency")}`;
  const fill = (key) =>
    t(key)
      .replace("{product}", product || "")
      .replace("{productName}", productName || product || "")
      .replace("{item}", t(`transfer.item.${item}`))
      .replace("{recipient}", user)
      .replace("{amount}", amountText)
      .replace("{n}", autoClose ?? "");

  useEffect(() => {
    if (embedded) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [embedded]);

  const openSupport = () => window.open(SUPPORT_URL, "_blank");

  const text = {
    pending: { title: fill("status.pendingTitle"), callout: fill("status.pendingText"), note: fill("status.pendingNote") },
    received: {
      title: fill("status.receivedTitle"),
      callout: fill(user ? "status.receivedText" : "status.receivedTextNoUser"),
      note: fill("status.receivedNote"),
    },
    success: {
      title: fill("status.successTitle"),
      callout: fill(user ? "status.successText" : "status.successTextNoUser"),
      note: autoClose != null ? fill("status.successNote") : "",
    },
    failed: { title: fill("status.failedTitle"), callout: fill("status.failedText"), note: orderId ? fill("status.failedNote") : "" },
    expired: { title: fill("status.expiredTitle"), callout: fill("status.expiredText"), note: fill("status.expiredNote") },
  }[stage];

  const amountLabel = {
    pending: t("status.expectedAmount"),
    expired: t("status.expectedWas"),
  }[stage] || t("status.paidAmount");

  const footer = {
    success: <button type="button" className="pt-cta" onClick={onDone || onClose}>{t("status.done")}</button>,
    failed: (
      <>
        <button type="button" className="pt-cta" onClick={openSupport}>{t("status.support")}</button>
        <button type="button" className="ps-ghost ps-ghost--spaced" onClick={onClose}>{t("status.close")}</button>
      </>
    ),
    expired: (
      <>
        <button type="button" className="pt-cta" onClick={onRetry || onClose}>{t("status.retry")}</button>
        <button type="button" className="ps-ghost ps-ghost--spaced" onClick={openSupport}>{t("status.iPaid")}</button>
      </>
    ),
  }[stage] || <button type="button" className="ps-ghost" onClick={onClose}>{t("status.close")}</button>;

  const screen = (
    <div className={`pt-screen ${embedded ? "pt-screen--embedded" : ""}`}>
      <div className="pt-top">
        <button type="button" className="pt-close" onClick={onClose} aria-label={t("transfer.close")}>✕</button>
        <span className="pt-top-title">{t("status.title")}</span>
        <span />
      </div>

      {/* Taymer tekshiruvda va vaqt tugaganda (00:00) ko'rinadi; qolganlarida
          xuddi shu o'lchamdagi bo'sh joy — belgi barcha holatlarda bir joyda */}
      {stage === "pending" || stage === "expired" ? (
        <Countdown left={stage === "expired" ? 0 : countdown} label={t("transfer.timeLeft")} />
      ) : (
        <div className="ps-countdown-space" aria-hidden="true">
          <Countdown left={0} label={t("transfer.timeLeft")} />
        </div>
      )}

      <div className="pt-body ps-body">
        <div className="ps-hero">
          <HeroIcon stage={stage} />
          <h3 className="pt-title">{text.title}</h3>
          <div className={`ps-callout ps-callout--${stage}`}>
            <span className="ps-callout-ic">{CALLOUT_ICON[stage]}</span>
            <span className="ps-callout-text">{rich(text.callout)}</span>
          </div>
          {extraNote && <p className="ps-extra">{extraNote}</p>}
        </div>

        <div className="ps-summary">
          <div className="ps-summary-main">
            <span className="ps-summary-label">
              {amountLabel}
              {/* Xatoda tranzaksiya ID kelmaydi — buyurtma raqami shu yerda */}
              {stage === "failed" && orderId && <> · {t("status.orderNo")} #{orderId}</>}
            </span>
            <span className="ps-summary-amount">{amountText}</span>
          </div>
          {badge && <span className="ps-summary-side">{badge}</span>}
        </div>

        {stage === "success" && txId && (
          <div className="ps-tx">
            <span>{t("status.txId")}</span>
            <code>{txId}</code>
          </div>
        )}
      </div>

      <div className="pt-bottom">
        {text.note && <p className="ps-foot-note">{text.note}</p>}
        {footer}
      </div>
    </div>
  );

  return embedded ? screen : createPortal(screen, document.body);
}
