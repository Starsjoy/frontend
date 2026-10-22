import { useEffect, useState } from "react";
import { usePaymentCard } from "../../hooks/usePaymentCard";
import { useTranslation } from "../../context/LanguageContext";
import PaymentTransfer from "../../components/PaymentTransfer/PaymentTransfer";
import PaymentConfirm from "../../components/PaymentTransfer/PaymentConfirm";
import defaultImage from "../../assets/defaul_image.png";
import "../Stars/Stars.css";
import "./TestLoaders.css";
import "./TestPaymentVariants.css";

// /test — to'lov ma'lumotlari ekrani: asl holat va joriy qilingan yangi
// ekran (PaymentTransfer) yonma-yon. Ma'lumotlar namunaviy.
const SAMPLE_ORDER = { stars: 100, amount: 21437 };
const SAMPLE_PROFILE = {
  fullName: "Fayzulloh",
  username: "starsjoy",
  imageUrl: defaultImage,
};
const SAMPLE_COUNTDOWN = 412;
const POLLING_SECONDS = 480;

const formatAmount = (num) =>
  num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");

const formatTime = (sec) => {
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

// Demo taymer: har soniyada kamayadi, 0 ga yetsa qaytadan boshlanadi
function useCountdown(start) {
  const [left, setLeft] = useState(start);
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s <= 1 ? POLLING_SECONDS : s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  return [left, setLeft];
}

function PhoneFrame({ tag, title, desc, children }) {
  return (
    <div className="sj-test-card pv-card">
      <div className="sj-test-meta">
        <span className={`pv-tag ${tag === "Asl holat" ? "pv-tag--orig" : ""}`}>{tag}</span>
        <h2>{title}</h2>
        <p>{desc}</p>
      </div>
      <div className="pv-frame">{children}</div>
    </div>
  );
}

/* ---------------- "TUSHUNDIM" OYNASI (Stars.jsx bilan bir xil) ---------------- */
// Order yaratilgandan KEYIN chiqadi; "Tushundim" faqat oynani yopib,
// to'lov ma'lumotlari ekranini ochadi (backend'ga so'rov yubormaydi).
function WarningModal({ t, order }) {
  return (
    <div className="stars-warn-overlay">
      <div className="stars-warn-panel">
        <div className="stars-warn-header">
          <h3 className="stars-warn-title">{t("payment.importantWarning")}</h3>
        </div>

        <div className="stars-warn-body">
          <div className="stars-warn-block">
            <strong>{t("payment.amountNote")}</strong>
            <br />
            {t("payment.exactNoteDesc")}
          </div>

          <div className="stars-warn-amount-highlight">
            <span className="stars-warn-label">{t("payment.amountLabel")}</span>
            <span className="stars-warn-amount">{formatAmount(order.amount)} {t("common.currency")}</span>
          </div>
        </div>

        <button type="button" className="stars-warn-btn">
          {t("payment.understoodBtn")}
        </button>
      </div>
    </div>
  );
}

const SAMPLE_RECIPIENT = "starsjoy";

/* ---------------- ASL HOLAT (Stars.jsx bilan bir xil) ---------------- */
function Original({ t, card, name, order, profile, left }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="payment-info-section">
          <div className="modal-header-bar">
            <span className="modal-header-title">{t("payment.modalTitle")}</span>
            <button type="button" className="modal-close-x">✕</button>
          </div>

          <div className="modal-profile-card">
            <img src={profile.imageUrl} className="modal-profile-img" />
            <div className="modal-profile-info">
              <div className="modal-profile-name">{profile.fullName}</div>
              <div className="modal-profile-username">@{profile.username}</div>
            </div>
            <div className="modal-stars-badge">⭐ {order.stars}</div>
          </div>

          <div className="modal-payment-grid">
            <div className="modal-pay-item">
              <div className="modal-pay-label">{t("payment.cardNumber")}</div>
              <div className="modal-pay-row">
                <span className="modal-pay-value">{card}</span>
                <button type="button" className="modal-copy-btn">📋</button>
              </div>
            </div>
            <div className="modal-pay-item">
              <div className="modal-pay-label">{t("payment.cardOwner")}</div>
              <div className="modal-pay-row">
                <span className="modal-pay-value">{name}</span>
              </div>
            </div>
            <div className="modal-pay-item highlight-amount">
              <div className="modal-pay-label">{t("payment.amountLabel")}</div>
              <div className="modal-pay-row">
                <span className="modal-pay-value bold">{formatAmount(order.amount)} {t("common.currency")}</span>
                <button type="button" className="modal-copy-btn">📋</button>
              </div>
            </div>
          </div>

          <div className="modal-warning-attention">
            <div className="warning-pulse"></div>
            <span className="warning-icon-big">⚠️</span>
            <div className="warning-text">
              <strong>{t("payment.attentionTitle")}</strong>
              <p>{t("payment.sendExactPre")} <span className="amount-highlight">{formatAmount(order.amount)} {t("common.currency")}</span> {t("payment.sendExactPost")}</p>
              <p className="warning-sub">{t("payment.wrongAmountHint")}</p>
            </div>
          </div>

          <div className="modal-timer-bar">
            <div className="modal-timer">
              <span className="timer-icon">⏳</span>
              <span className="timer-text">{formatTime(left)}</span>
            </div>
          </div>
          <button type="button" className="btn-payment-done">{t("payment.paidBtn")}</button>
          <p className="modal-close-hint">{t("payment.hint")}</p>
        </div>
      </div>
    </div>
  );
}

export default function TestPaymentStates() {
  const { t } = useTranslation();
  const paymentCard = usePaymentCard();
  const [left, setLeft] = useCountdown(SAMPLE_COUNTDOWN);
  const card = paymentCard.display || "8600 1234 5678 9012";
  const name = paymentCard.name || "FAYZULLOH SH.";

  // /test?full — haqiqiy to'liq ekran rejimi (qurilma o'lchamlarini tekshirish uchun)
  // /test?full&lang=ru — tilni tekshirish (faqat shu brauzerning localStorage'iga yoziladi)
  const params = new URLSearchParams(window.location.search);
  const lang = params.get("lang");
  if (lang && localStorage.getItem("language") !== lang) {
    localStorage.setItem("language", lang);
    window.location.reload();
    return null;
  }
  // /test?w=320&h=568 — aniq qurilma o'lchamidagi ramka (&screen=confirm — Xavfsiz to'lov oynasi)
  if (params.has("w")) {
    return (
      <div style={{ position: "relative", width: +params.get("w"), height: +params.get("h") || 700, transform: "translateZ(0)", overflow: "hidden", background: "#1a1a2e" }}>
        {params.get("screen") === "confirm" ? (
          <PaymentConfirm
            embedded
            amount={SAMPLE_ORDER.amount}
            product={`${SAMPLE_ORDER.stars} Stars`}
            recipient={SAMPLE_RECIPIENT}
            onContinue={() => {}}
          />
        ) : (
        <PaymentTransfer
          embedded
          cardDisplay={card}
          cardNumber={paymentCard.number || "8600123456789012"}
          cardName={name}
          amount={SAMPLE_ORDER.amount}
          countdown={left}
          item="stars"
          onClose={() => {}}
          onPaid={() => {}}
        />
        )}
      </div>
    );
  }
  if (params.has("full")) {
    return (
      <PaymentTransfer
        cardDisplay={card}
        cardNumber={paymentCard.number || "8600123456789012"}
        cardName={name}
        amount={SAMPLE_ORDER.amount}
        countdown={left}
        item="stars"
        onClose={() => {}}
        onPaid={() => {}}
      />
    );
  }

  return (
    <div className="sj-test-page">
      <div className="sj-test-header">
        <h1>To'lov oqimi</h1>
        <p>«Tushundim» oynasi va to'lov ekrani. Til ilova sozlamasidan olinadi.</p>
        <div className="pv-jump">
          <span>Taymerni sinash:</span>
          {[[412, "6:52"], [110, "1:50"], [45, "0:45"]].map(([sec, label]) => (
            <button key={sec} type="button" onClick={() => setLeft(sec)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="sj-test-header pv-section-head">
        <h1>«Tushundim» oynasi</h1>
        <p>Order yaratilgach chiqadi. Tugma backend'ga so'rov yubormaydi — faqat to'lov ekranini ochadi.</p>
      </div>

      <div className="sj-test-grid pv-grid pv-grid--two">
        <PhoneFrame tag="Asl holat" title="Hozirgi oyna" desc="Taqqoslash uchun">
          <WarningModal t={t} order={SAMPLE_ORDER} />
        </PhoneFrame>
        <PhoneFrame tag="Yangi" title="Xavfsiz to'lov" desc="PaymentConfirm — Stars, Premium, Gift">
          <PaymentConfirm
            embedded
            amount={SAMPLE_ORDER.amount}
            product={`${SAMPLE_ORDER.stars} Stars`}
            recipient={SAMPLE_RECIPIENT}
            onContinue={() => {}}
          />
        </PhoneFrame>
      </div>

      <div className="sj-test-header pv-section-head">
        <h1>To'lov ekrani</h1>
        <p>«Tushundim» dan keyin ochiladi.</p>
      </div>

      <div className="sj-test-grid pv-grid">
        <PhoneFrame tag="Asl holat" title="Eski ekran" desc="Taqqoslash uchun">
          <Original t={t} card={card} name={name} order={SAMPLE_ORDER} profile={SAMPLE_PROFILE} left={left} />
        </PhoneFrame>
        <PhoneFrame tag="Yangi" title="Joriy qilingan ekran" desc="PaymentTransfer — Stars, Premium, Gift, Discount">
          <PaymentTransfer
            embedded
            cardDisplay={card}
            cardNumber={paymentCard.number || "8600123456789012"}
            cardName={name}
            amount={SAMPLE_ORDER.amount}
            countdown={left}
            item="stars"
            onClose={() => {}}
            onPaid={() => {}}
          />
        </PhoneFrame>
      </div>
    </div>
  );
}
