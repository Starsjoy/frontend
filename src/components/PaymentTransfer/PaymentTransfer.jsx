import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "../../context/LanguageContext";
import "./PaymentTransfer.css";

/**
 * To'lov ma'lumotlari ekrani (status = "payment_info") — Stars, Premium,
 * Gift va Discount sahifalari uchun umumiy.
 *
 * Muammo: foydalanuvchilar ko'rsatilgan kartani "o'z kartasini kiritish"
 * deb tushunardi. Bu ekran pulni shu kartaga istalgan ilovadan aniq summada
 * O'TKAZISH kerakligini ko'rsatadi; "Qo'llanma" oynasi qadamlarni beradi.
 *
 * document.body ga portal orqali chiqadi — sahifadagi transform/overflow
 * to'liq ekranli qatlamni kesib qo'ymasligi uchun.
 */

const TOTAL_SECONDS = 480; // 8 daqiqa — sahifalardagi polling muddati

const formatAmount = (num) =>
  num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const formatTime = (sec) => {
  const s = Math.max(0, sec || 0);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const CopyIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="12" height="12" rx="2.5" />
    <path d="M5 15V5a2 2 0 0 1 2-2h8" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

function useCopy() {
  const [copied, setCopied] = useState("");
  const copy = (key, value) => {
    navigator.clipboard?.writeText(String(value)).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(""), 1600);
  };
  return [copied, copy];
}

// Qolgan vaqt: 2 daqiqadan kam — sariq, 1 daqiqadan kam — qizil
function Countdown({ left, label }) {
  const tone = left <= 60 ? "is-danger" : left <= 120 ? "is-warn" : "";
  const percent = Math.min(100, Math.max(0, (left / TOTAL_SECONDS) * 100));
  return (
    <div className={`pt-countdown ${tone}`}>
      <div className="pt-countdown-row">
        <span className="pt-countdown-label"><ClockIcon /> {label}</span>
        <span className="pt-countdown-time">{formatTime(left)}</span>
      </div>
      <div className="pt-countdown-track">
        <div className="pt-countdown-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function Guide({ t, amountText, onClose }) {
  const steps = [1, 2, 3, 4, 5].map((n) => ({
    title: t(`transfer.step${n}`).replace("{amount}", amountText),
    sub: t(`transfer.step${n}Sub`),
    key: n === 4,
  }));
  return (
    <div className="pt-modal" onClick={onClose}>
      <div className="pt-modal-panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="pt-modal-x" onClick={onClose} aria-label={t("transfer.close")}>✕</button>
        <h3 className="pt-modal-title">{t("transfer.guideTitle")}</h3>
        <p className="pt-modal-text">{t("transfer.guideSub")}</p>
        <ol className="pt-steps">
          {steps.map((st, i) => (
            <li key={i} className={st.key ? "is-key" : ""}>
              <span className="pt-steps-n">{i + 1}</span>
              <div>
                <div className="pt-steps-title">{st.title}</div>
                <div className="pt-steps-sub">{st.sub}</div>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className="pt-cta pt-modal-cta" onClick={onClose}>
          {t("transfer.understood")}
        </button>
      </div>
    </div>
  );
}

export default function PaymentTransfer({
  cardDisplay,
  cardNumber,
  cardName,
  amount,
  countdown,
  item = "stars",
  onClose,
  onPaid,
  embedded = false, // /test sahifasidagi telefon ramkasi uchun: portal va scroll-lock'siz
}) {
  const { t } = useTranslation();
  const [copied, copy] = useCopy();
  const [guideOpen, setGuideOpen] = useState(false);
  const amountText = `${formatAmount(amount)} ${t("common.currency")}`;
  const itemName = t(`transfer.item.${item}`);

  // Ekran ochiq paytda orqadagi sahifa aylanmasin
  useEffect(() => {
    if (embedded) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [embedded]);

  const screen = (
    <div className={`pt-screen ${embedded ? "pt-screen--embedded" : ""}`}>
      <div className="pt-top">
        <button type="button" className="pt-close" onClick={onClose} aria-label={t("transfer.close")}>✕</button>
        <span className="pt-top-title">{t("transfer.screenTitle")}</span>
        <span />
      </div>

      <Countdown left={countdown} label={t("transfer.timeLeft")} />

      <div className="pt-body">
        <div className="pt-head">
          <h3 className="pt-title">{t("transfer.title")}</h3>
          <p className="pt-muted">{t("transfer.apps")}</p>
        </div>

        <button type="button" className="pt-plastic" onClick={() => copy("card", cardNumber)}>
          <span className="pt-plastic-label">{t("transfer.recipient")}</span>
          {/* Konteyner kengligiga moslashadi — raqam doim bir qatorda */}
          <div className="pt-fit">
            <span className="pt-cardnum">{cardDisplay}</span>
          </div>
          <span className="pt-plastic-foot">
            <span className="pt-plastic-name">{cardName}</span>
            <span className="pt-plastic-copy">
              {copied === "card"
                ? <><CheckIcon /> {t("transfer.copied")}</>
                : <><CopyIcon /> {t("transfer.copy")}</>}
            </span>
          </span>
        </button>

        <button type="button" className="pt-amount" onClick={() => copy("amount", amount)}>
          <span className="pt-amount-main">
            <span className="pt-amount-label">{t("transfer.amountLabel")}</span>
            <span className="pt-amount-value">{amountText}</span>
          </span>
          <span className={`pt-copy ${copied === "amount" ? "is-done" : ""}`}>
            {copied === "amount" ? <CheckIcon /> : <CopyIcon />}
          </span>
        </button>

        <div className="pt-warn">
          <span className="pt-warn-icon">!</span>
          <div>
            <strong>{t("transfer.exactTitle")}</strong>
            <p>{t("transfer.exactDesc").replace("{item}", itemName)}</p>
          </div>
        </div>

        <button type="button" className="pt-help" onClick={() => setGuideOpen(true)}>
          <span className="pt-help-q">?</span>
          {t("transfer.guide")}
        </button>
      </div>

      <div className="pt-bottom">
        <button type="button" className="pt-cta" onClick={onPaid}>
          {t("transfer.paid")}
        </button>
      </div>

      {guideOpen && <Guide t={t} amountText={amountText} onClose={() => setGuideOpen(false)} />}
    </div>
  );

  return embedded ? screen : createPortal(screen, document.body);
}
