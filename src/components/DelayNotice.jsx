import { useTranslation } from "../context/LanguageContext";
import useDelayNotice from "../hooks/useDelayNotice";
import "./DelayNotice.css";

const ClockIcon = ({ size = 20 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

/**
 * "Buyurtmalar 12 soatgacha kechikishi mumkin" — admin switchi yoqilganda.
 * @param {'card'|'inline'|'compact'} variant
 *   card    — umumiy blok (sarlavha + matn), hozir ishlatilmaydi
 *   inline  — xarid sahifasi (Stars/Premium)
 *   compact — to'lovni tasdiqlash oynasi ichida
 */
export default function DelayNotice({ variant = "card", className = "" }) {
  const { t } = useTranslation();
  const on = useDelayNotice();
  if (!on) return null;

  return (
    <div className={`dn dn--${variant} ${className}`.trim()} role="status">
      <span className="dn__ic"><ClockIcon size={variant === "compact" ? 16 : 20} /></span>
      <span className="dn__text">
        {variant !== "compact" && <b>{t("ui.delayTitle")}</b>}
        <span>{variant === "compact" ? t("ui.delayShort") : t("ui.delayText")}</span>
      </span>
    </div>
  );
}
