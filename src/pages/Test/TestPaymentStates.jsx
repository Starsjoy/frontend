import { useEffect, useState } from "react";
import { usePaymentCard } from "../../hooks/usePaymentCard";
import { useTranslation } from "../../context/LanguageContext";
import PaymentTransfer from "../../components/PaymentTransfer/PaymentTransfer";
import PaymentConfirm from "../../components/PaymentTransfer/PaymentConfirm";
import PaymentStatus from "../../components/PaymentTransfer/PaymentStatus";
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

function PhoneFrame({ tag, title, desc, controls, children }) {
  return (
    <div className="sj-test-card pv-card">
      <div className="sj-test-meta">
        <span className={`pv-tag ${tag === "Asl holat" ? "pv-tag--orig" : ""}`}>{tag}</span>
        <h2>{title}</h2>
        <p>{desc}</p>
        {controls}
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

/* ---------------- TO'LOVDAN KEYINGI HOLATLAR (Stars.jsx bilan bir xil) ---------------- */
const SAMPLE_TX_ID = "a1b2c3d4e5f6";

// "To'lov qildim" bosilgach: status = "pending" — to'lov qidirilmoqda
function PendingScreen({ t, card, order, left }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="pending-waiting-section">
          <div className="modal-header-bar">
            <span className="modal-header-title">{t("payment.pendingTitle")}</span>
            <button type="button" className="modal-close-x">✕</button>
          </div>

          <div className="waiting-animation-wrap">
            <div className="waiting-circle-outer">
              <div className="waiting-circle-inner">
                <div className="waiting-icon">🔍</div>
              </div>
            </div>
            <div className="waiting-dots">
              <span></span><span></span><span></span>
            </div>
          </div>

          <h3 className="waiting-title">{t("payment.searching")}</h3>
          <p className="waiting-subtitle">{t("payment.autoDetect")}</p>

          <div className="waiting-payment-info">
            <div className="waiting-info-row">
              <span className="waiting-label">{t("payment.cardLabel")}</span>
              <span className="waiting-value">{card}</span>
              <button type="button" className="modal-copy-btn-sm">📋</button>
            </div>
            <div className="waiting-info-row highlight">
              <span className="waiting-label">{t("payment.amountShortLabel")}</span>
              <span className="waiting-value bold">{formatAmount(order.amount)} {t("common.currency")}</span>
            </div>
          </div>

          <div className="waiting-timer">
            <span className="timer-icon-sm">⏱️</span>
            <span>{formatTime(left)}</span>
          </div>

          <p className="modal-close-hint">{t("payment.tracked")}</p>
        </div>
      </div>
    </div>
  );
}

// To'lov topildi: status = "payment_received" — Stars yuborilmoqda
function ReceivedScreen({ t, order, profile }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-sending-section">
          <div className="sending-anim-wrap">
            <div className="sending-pulse-ring"></div>
            <div className="sending-pulse-ring delay"></div>
            <div className="sending-center-icon">💫</div>
          </div>
          <h3 className="sending-title">{t("payment.received")}</h3>
          <p className="sending-subtitle">{t("payment.sendingStars")}</p>

          <div className="sending-recipient">
            <img src={profile.imageUrl} className="sending-avatar" />
            <div className="sending-info">
              <span className="sending-name">{profile.fullName}</span>
              <span className="sending-user">@{profile.username}</span>
            </div>
            <div className="sending-stars-count">⭐ {order.stars}</div>
          </div>

          <div className="sending-progress-bar">
            <div className="sending-progress-fill"></div>
          </div>
          <p className="sending-hint">{t("payment.waitAuto")}</p>
        </div>
      </div>
    </div>
  );
}

// Stars yuborildi: status = "stars_sent"
function SuccessScreen({ t, order, profile }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-success-section">
          <div className="success-confetti">
            <span></span><span></span><span></span><span></span><span></span><span></span>
          </div>

          <div className="success-check-wrap">
            <svg className="success-check-svg" viewBox="0 0 52 52">
              <circle className="success-check-circle" cx="26" cy="26" r="25" fill="none" />
              <path className="success-check-path" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
          </div>

          <h3 className="success-title">{t("payment.successTitle")}</h3>
          <p className="success-amount">{t("stars.starsSent").replace("{count}", order.stars)}</p>

          <div className="success-recipient-card">
            <img src={profile.imageUrl} className="success-avatar" />
            <div className="success-user-info">
              <span className="success-user-name">{profile.fullName}</span>
              <span className="success-user-handle">@{profile.username}</span>
            </div>
            <div className="success-delivered-badge">{t("payment.deliveredBadge")}</div>
          </div>

          <div className="success-details">
            <div className="success-detail-row">
              <span className="success-detail-label">Stars</span>
              <span className="success-detail-value">{order.stars} ⭐</span>
            </div>
            <div className="success-detail-row">
              <span className="success-detail-label">{t("payment.payLabel")}</span>
              <span className="success-detail-value">{formatAmount(order.amount)} {t("common.currency")}</span>
            </div>
          </div>

          <div className="modal-txid">
            <span className="modal-txid-label">{t("payment.txIdLabel")}</span>
            <div className="modal-txid-row">
              <code>{SAMPLE_TX_ID}</code>
              <button type="button" className="modal-copy-btn">📋</button>
            </div>
          </div>

          <p className="modal-auto-close">{t("stars.autoClose").replace("{timer}", 20)}</p>
        </div>
      </div>
    </div>
  );
}

// 8 daqiqa ichida to'lov kelmadi: status = "expired"
function ExpiredScreen({ t }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-result-section">
          <button type="button" className="modal-close-x expired-x">✕</button>
          <div className="modal-result-icon expired-bg">⏰</div>
          <h3 className="modal-result-title">{t("payment.expiredTitle")}</h3>
          <p className="modal-result-desc">{t("payment.expiredDesc")}</p>
          <button type="button" className="btn-go-home">{t("payment.goHome")}</button>
        </div>
      </div>
    </div>
  );
}

// To'lov kelgan, lekin Stars yuborilmagan: status = "failed" | "error"
const SAMPLE_ERROR = "";
const SAMPLE_ORDER_ID = 48213;

function FailedScreen({ t }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-result-section">
          <button type="button" className="modal-close-x expired-x">✕</button>
          <div className="modal-result-icon expired-bg" style={{ background: "rgba(255, 59, 48, 0.15)", color: "#ff3b30" }}>❌</div>
          <h3 className="modal-result-title">{t("payment.errorTitle")}</h3>
          <p className="modal-result-desc">{SAMPLE_ERROR || t("stars.starsError")}</p>
          <button type="button" className="btn-go-home">{t("payment.contactAdmin")}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Yangi holat ekranlari: PaymentStatus (mahsulot bo'yicha) ---------- */
const NEW_STAGES = [
  ["pending", "1 · Tekshirilmoqda"],
  ["received", "2 · Qabul qilindi"],
  ["success", "3 · Muvaffaqiyatli"],
  ["failed", "Xato · Yuborilmadi"],
  ["delayed", "Kechikdi · Admin yuboradi"],
  ["expired", "Vaqt · To'lov kelmadi"],
];

// Sahifalar PaymentStatus'ga beradigan qiymatlar bilan bir xil
function productProps(kind, t) {
  if (kind === "premium") {
    return { item: "premium", product: t("transfer.premiumMonths").replace("{n}", 3), productName: "Premium", badge: "💎 3" };
  }
  if (kind === "gift") {
    return { item: "gift", product: t("status.giftName"), productName: t("status.giftName"), badge: "🎁", extraFailed: t("transfer.giftPrivacy") };
  }
  return { item: "stars", product: `${SAMPLE_ORDER.stars} Stars`, productName: "Stars", badge: `${SAMPLE_ORDER.stars} ⭐` };
}

export default function TestPaymentStates() {
  const { t } = useTranslation();
  const paymentCard = usePaymentCard();
  const [left, setLeft] = useCountdown(SAMPLE_COUNTDOWN);
  const [product, setProduct] = useState("stars");
  const [replay, setReplay] = useState(0);
  const pp = productProps(product, t);
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
  // /test?w=320&h=568 — aniq qurilma o'lchamidagi ramka (&screen=confirm — Xavfsiz to'lov oynasi, &ps=pending|received|success|failed|expired&product=stars|premium|gift)
  if (params.has("w")) {
    return (
      <div style={{ position: "relative", width: +params.get("w"), height: +params.get("h") || 700, transform: "translateZ(0)", overflow: "hidden", background: "#1a1a2e" }}>
        {params.get("ps") ? (
          <PaymentStatus
            embedded
            stage={params.get("ps")}
            {...productProps(params.get("product") || "stars", t)}
            extraNote={params.get("ps") === "failed" ? productProps(params.get("product") || "stars", t).extraFailed : ""}
            recipient={SAMPLE_RECIPIENT}
            amount={SAMPLE_ORDER.amount}
            countdown={left}
            txId={SAMPLE_TX_ID}
            orderId={SAMPLE_ORDER_ID}
            autoClose={20}
          />
        ) : params.get("screen") === "confirm" ? (
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

      <div className="sj-test-header pv-section-head">
        <h1>To'lovdan keyin</h1>
        <p>«To'lov qildim» bosilgach ketma-ket chiqadigan holatlar — hozirgi ko'rinishi.</p>
      </div>

      <div className="sj-test-grid pv-grid pv-grid--five">
        <PhoneFrame tag="1" title="To'lov aniqlanmoqda" desc='status = "pending" — to&apos;lov qidirilmoqda'>
          <PendingScreen t={t} card={card} order={SAMPLE_ORDER} left={left} />
        </PhoneFrame>
        <PhoneFrame tag="2" title="To'lov qabul qilindi" desc='status = "payment_received" — Stars yuborilmoqda'>
          <ReceivedScreen t={t} order={SAMPLE_ORDER} profile={SAMPLE_PROFILE} />
        </PhoneFrame>
        <PhoneFrame tag="3" title="Muvaffaqiyatli" desc='status = "stars_sent" — Stars yuborildi'>
          <SuccessScreen t={t} order={SAMPLE_ORDER} profile={SAMPLE_PROFILE} />
        </PhoneFrame>
        <PhoneFrame tag="Xato" title="Yuborilmadi" desc='status = "failed" / "error" — to&apos;lov keldi, Stars ketmadi'>
          <FailedScreen t={t} />
        </PhoneFrame>
        <PhoneFrame tag="Vaqt" title="To'lov kelmadi" desc='status = "expired" — 8 daqiqada to&apos;lov topilmadi'>
          <ExpiredScreen t={t} />
        </PhoneFrame>
      </div>

      <div className="sj-test-header pv-section-head">
        <h1>To'lovdan keyin — yangi</h1>
        <p>PaymentStatus — Stars, Premium, Gift, Discount sahifalarida ishlatiladi.</p>
        <div className="pv-toggle" role="group" aria-label="Mahsulot">
          {[["stars", "Stars"], ["premium", "Premium"], ["gift", "Sovg'a"]].map(([key, label]) => (
            <button key={key} type="button" className={product === key ? "is-on" : ""} onClick={() => setProduct(key)}>
              {label}
            </button>
          ))}
          <button type="button" className="pv-toggle-replay" aria-label="Qayta o'ynatish" onClick={() => setReplay((r) => r + 1)}>↻</button>
        </div>
      </div>

      <div className="sj-test-grid pv-grid pv-grid--five">
        {NEW_STAGES.map(([stage, label]) => (
          <PhoneFrame key={stage} tag="Yangi" title={label} desc={stage}>
            <PaymentStatus
              key={`${product}-${replay}`}
              embedded
              stage={stage}
              item={pp.item}
              product={pp.product}
              productName={pp.productName}
              badge={pp.badge}
              recipient={SAMPLE_RECIPIENT}
              amount={SAMPLE_ORDER.amount}
              countdown={left}
              txId={SAMPLE_TX_ID}
              orderId={SAMPLE_ORDER_ID}
              autoClose={20}
              extraNote={stage === "failed" ? pp.extraFailed : ""}
            />
          </PhoneFrame>
        ))}
      </div>
    </div>
  );
}
