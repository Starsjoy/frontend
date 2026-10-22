import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "../../context/LanguageContext";
import "./PaymentTransfer.css";

/**
 * "Xavfsiz to'lov" oynasi — order yaratilgandan keyin, to'lov ekranidan oldin
 * chiqadi (Stars, Premium, Gift). Tugma backend'ga so'rov yubormaydi: faqat
 * sahifaning handleWarningUnderstood'ini chaqiradi va PaymentTransfer ochiladi.
 */

const formatAmount = (num) =>
  num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" />
    <path d="M8.8 12.2l2.2 2.2 4.2-4.4" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export default function PaymentConfirm({
  amount,
  product,      // masalan "100 Stars", "Premium · 3 oy"
  recipient,    // username, @ siz; bo'lmasa ko'rsatilmaydi
  note,         // qo'shimcha shart (Gift: profil maxfiyligi)
  onContinue,
  embedded = false, // /test sahifasidagi ramka uchun: portal va scroll-lock'siz
}) {
  const { t } = useTranslation();
  const cleanRecipient = (recipient || "").replace(/^@/, "").trim();

  useEffect(() => {
    if (embedded) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [embedded]);

  const dialog = (
    <div className={`pc-overlay ${embedded ? "pc-overlay--embedded" : ""}`}>
      <div className="pc-panel" role="dialog" aria-modal="true" aria-labelledby="pc-title">
        <div className="pc-badge"><ShieldIcon /></div>
        <h3 id="pc-title" className="pc-title">{t("transfer.confirmTitle")}</h3>
        {product && (
          <p className="pc-sub">
            {product}
            {cleanRecipient && <> → @{cleanRecipient}</>}
          </p>
        )}

        <div className="pc-message">
          {t("transfer.confirmPre")}
          <span className="pc-amount">{formatAmount(amount)} {t("common.currency")}</span>
          {t("transfer.confirmPost")}
        </div>

        {note && <p className="pc-note">{note}</p>}

        <p className="pc-auto">
          <span className="pc-auto-ic"><CheckIcon /></span>
          {t("transfer.confirmAuto")}
        </p>

        <button type="button" className="pc-cta" onClick={onContinue}>
          {t("transfer.confirmCta")}
        </button>
      </div>
    </div>
  );

  return embedded ? dialog : createPortal(dialog, document.body);
}
