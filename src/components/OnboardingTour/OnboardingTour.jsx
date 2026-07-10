import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useOnboarding } from "../../context/OnboardingContext";
import { useTranslation } from "../../context/LanguageContext";
import apiFetch from "../../utils/apiFetch";
import {
  getPremiumPurchasePath,
  getStarsPurchasePath,
} from "../../utils/starsPurchaseRoute";
import { TGSSticker } from "../TGSSticker";
import "./OnboardingTour.css";

import starsGif from "../../assets/stars.gif";
import premiumGif from "../../assets/premium_gif.gif";
import giftSticker from "../../assets/5800655655995968830.tgs";

const SPOT_PAD = 10;
const MAX_TRIES = 20; // ~2.4s; topilmasa spotlightsiz davom etadi

/**
 * Qadam maydonlari:
 *   tourId       — maqsad elementning data-tour-id si (null = faqat karta)
 *   route        — qadam ochilishi kerak bo'lgan sahifa
 *   hint         — "tap" (👆) yoki "type" (⌨️) badge
 *   illustration — "card" yoki "payment" demo bloki
 */
function buildSteps(t, paths) {
  const s = (k) => t(`onboarding.${k}`);
  const cardStep = (svc) => ({
    tourId: null, route: null, icon: "💳",
    title: s(`${svc}.cardTitle`), desc: s(`${svc}.cardDesc`), illustration: "card",
  });
  const payStep = (svc) => ({
    tourId: null, route: null, icon: "💰",
    title: s(`${svc}.payTitle`), desc: s(`${svc}.payDesc`), illustration: "payment",
  });

  return {
    stars: [
      { tourId: "tour-stars-btn", route: "/", hint: "tap", icon: "⭐", title: s("stars.step0Title"), desc: s("stars.step0Desc") },
      { tourId: "tour-username", route: paths.stars, hint: "type", icon: "👤", title: s("stars.step1Title"), desc: s("stars.step1Desc") },
      { tourId: "tour-stars-amount", route: paths.stars, hint: "type", icon: "🔢", title: s("stars.step2Title"), desc: s("stars.step2Desc") },
      { tourId: "tour-stars-submit", route: paths.stars, hint: "tap", icon: "🛒", title: s("stars.step3Title"), desc: s("stars.step3Desc") },
      cardStep("stars"),
      payStep("stars"),
    ],
    premium: [
      { tourId: "tour-premium-btn", route: "/", hint: "tap", icon: "👑", title: s("premium.step0Title"), desc: s("premium.step0Desc") },
      { tourId: "tour-username", route: paths.premium, hint: "type", icon: "👤", title: s("premium.step1Title"), desc: s("premium.step1Desc") },
      { tourId: "tour-premium-plan", route: paths.premium, hint: "tap", icon: "📅", title: s("premium.step2Title"), desc: s("premium.step2Desc") },
      { tourId: "tour-premium-submit", route: paths.premium, hint: "tap", icon: "🛒", title: s("premium.step3Title"), desc: s("premium.step3Desc") },
      cardStep("premium"),
      payStep("premium"),
    ],
    gift: [
      { tourId: "tour-gift-btn", route: "/", hint: "tap", icon: "🎁", title: s("gift.step0Title"), desc: s("gift.step0Desc") },
      { tourId: "tour-username", route: "/gift", hint: "type", icon: "👤", title: s("gift.step1Title"), desc: s("gift.step1Desc") },
      { tourId: "tour-gift-select", route: "/gift", hint: "tap", icon: "🎀", title: s("gift.step2Title"), desc: s("gift.step2Desc") },
      cardStep("gift"),
      payStep("gift"),
    ],
  };
}

/** Maqsad elementni DOM'da kutadi va koordinatalarini beradi. */
function useSpotlight(tourId, stepIndex, service) {
  const [rect, setRect] = useState(null);
  const [gaveUp, setGaveUp] = useState(false);
  const timerRef = useRef(null);
  const triesRef = useRef(0);

  useEffect(() => {
    setRect(null);
    setGaveUp(false);
    triesRef.current = 0;
    if (!tourId) return undefined;

    const measure = (el) => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top - SPOT_PAD, left: r.left - SPOT_PAD, width: r.width + SPOT_PAD * 2, height: r.height + SPOT_PAD * 2 });
    };

    const find = () => {
      const el = document.querySelector(`[data-tour-id="${tourId}"]`);
      if (el) {
        measure(el);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // scroll tugagach koordinatalar siljiydi — qayta o'lchaymiz
        timerRef.current = setTimeout(() => measure(el), 450);
        return;
      }
      // Sahifa hali render bo'lmagan bo'lishi mumkin. Cheklangan urinish:
      // element umuman bo'lmasa tur qotib qolmasin, spotlightsiz davom etadi.
      if (++triesRef.current > MAX_TRIES) {
        setGaveUp(true);
        return;
      }
      timerRef.current = setTimeout(find, 120);
    };

    timerRef.current = setTimeout(find, 300); // route almashgach DOM'ga vaqt
    return () => clearTimeout(timerRef.current);
  }, [tourId, stepIndex, service]);

  return { rect, gaveUp };
}

function CardIllustration({ t }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="ob-illu">
      <div className="ob-illu-label">{t("onboarding.cardLabel")}</div>
      <div className="ob-illu-card">8600 •••• •••• 1234</div>
      <button
        type="button"
        className={`ob-illu-copy ${copied ? "done" : ""}`}
        onClick={() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? t("onboarding.copyBtnDone") : t("onboarding.copyBtn")}
      </button>
      <div className="ob-illu-arrow">↑</div>
      <p className="ob-illu-hint">{t("onboarding.copyHint")}</p>
    </div>
  );
}

function PaymentIllustration({ t }) {
  return (
    <div className="ob-illu">
      <div className="ob-illu-label">{t("onboarding.paymentAmountLabel")}</div>
      <div className="ob-illu-amount">52 470 so'm</div>
      <div className="ob-illu-warn">{t("onboarding.paymentAmountNote")}</div>
      <div className="ob-illu-banks">
        {["Uzum", "Payme", "Click", "Humo"].map((b) => (
          <span key={b} className="ob-bank-chip">{b}</span>
        ))}
      </div>
      <p className="ob-illu-hint">{t("onboarding.paymentBankHint")}</p>
    </div>
  );
}

export default function OnboardingTour() {
  const { tourActive, tourStep, tourService, setTourStep, setTourService, endTour } = useOnboarding();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // Stars/Premium sahifa yo'llari admin sozlamasiga qarab o'zgaradi (paymee | fragment | legacy)
  const [paths, setPaths] = useState({ stars: "/stars", premium: "/premium" });
  useEffect(() => {
    if (!tourActive) return;
    apiFetch("/api/app-config")
      .then((r) => r.json())
      .then((cfg) => setPaths({ stars: getStarsPurchasePath(cfg), premium: getPremiumPurchasePath(cfg) }))
      .catch(() => {});
  }, [tourActive]);

  const steps = useMemo(() => buildSteps(t, paths), [t, paths]);
  const list = tourService ? steps[tourService] : [];
  const isServiceSelect = tourStep === -1;
  const isDone = !!tourService && tourStep >= list.length;
  const currentStep = !isServiceSelect && !isDone ? list[tourStep] : null;

  const { rect: spotRect, gaveUp } = useSpotlight(currentStep?.tourId, tourStep, tourService);

  // Qadam o'z sahifasiga o'zi o'tadi
  useEffect(() => {
    if (!tourActive || !currentStep?.route) return;
    if (location.pathname !== currentStep.route) navigate(currentStep.route);
  }, [tourActive, tourStep, tourService, currentStep?.route, location.pathname, navigate]);

  const finish = useCallback(() => {
    endTour();
    navigate("/");
  }, [endTour, navigate]);

  if (!tourActive) return null;

  const SERVICE_INFO = {
    stars: { label: "Telegram Stars", media: "gif", src: starsGif, color: "#f9a825", desc: t("onboarding.starsServiceDesc") },
    premium: { label: "Telegram Premium", media: "gif", src: premiumGif, color: "#0088cc", desc: t("onboarding.premiumServiceDesc") },
    gift: { label: "Telegram Gift", media: "tgs", src: giftSticker, color: "#7c3aed", desc: t("onboarding.giftServiceDesc") },
  };

  const showSpotlight = currentStep?.tourId && !gaveUp;

  return createPortal(
    <div className="ob-root">
      {/* ---------- Xizmat tanlash ---------- */}
      {isServiceSelect && (
        <div className="ob-fullscreen">
          <h2 className="ob-fs-title">{t("onboarding.whatToBuy")}</h2>
          <p className="ob-fs-sub">{t("onboarding.selectService")}</p>

          <div className="ob-service-list">
            {Object.entries(SERVICE_INFO).map(([key, info], i) => (
              <button
                key={key}
                className="ob-service-card"
                style={{ "--card-color": info.color, "--delay": `${i * 0.1}s` }}
                onClick={() => {
                  setTourService(key);
                  setTourStep(0);
                }}
              >
                <div className="ob-service-media">
                  {info.media === "gif" ? (
                    <img src={info.src} alt={info.label} />
                  ) : (
                    <TGSSticker stickerPath={info.src} className="ob-service-tgs" autoplay loop />
                  )}
                </div>
                <div className="ob-service-text">
                  <span className="ob-service-name">{info.label}</span>
                  <span className="ob-service-desc">{info.desc}</span>
                </div>
                <span className="ob-service-arrow">→</span>
              </button>
            ))}
          </div>

          <button className="ob-skip-link" onClick={endTour}>{t("onboarding.skip")}</button>
        </div>
      )}

      {/* ---------- Yakun ---------- */}
      {isDone && (
        <div className="ob-fullscreen">
          <div className="ob-done-emoji">🎉</div>
          <h2 className="ob-fs-title">{t("onboarding.doneTitle")}</h2>
          <p className="ob-fs-sub">{t("onboarding.doneDesc")}</p>
          <button className="ob-btn primary ob-done-btn" onClick={finish}>
            {t("onboarding.startBtn")} 🚀
          </button>
        </div>
      )}

      {/* ---------- Qadam ---------- */}
      {currentStep && (
        <>
          {showSpotlight ? (
            <>
              <div className="ob-backdrop" />
              {spotRect && (
                <div className="ob-spotlight" style={spotRect}>
                  {currentStep.hint && (
                    <span className={`ob-hint ${currentStep.hint}`}>
                      {currentStep.hint === "tap"
                        ? `👆 ${t("onboarding.tapHint")}`
                        : `⌨️ ${t("onboarding.typeHint")}`}
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="ob-backdrop ob-backdrop--full" />
          )}

          <div className="ob-step-card" key={`${tourService}-${tourStep}`}>
            <div className="ob-step-dots">
              {list.map((_, i) => (
                <span key={i} className={`ob-dot ${i === tourStep ? "active" : ""} ${i < tourStep ? "past" : ""}`} />
              ))}
            </div>

            <div className="ob-step-icon">{currentStep.icon}</div>
            <h3 className="ob-step-title">{currentStep.title}</h3>
            <p className="ob-step-desc">{currentStep.desc}</p>

            {currentStep.illustration === "card" && <CardIllustration t={t} />}
            {currentStep.illustration === "payment" && <PaymentIllustration t={t} />}

            <div className="ob-step-actions">
              <button
                className="ob-btn ghost"
                onClick={() => {
                  // 0-qadamdan orqaga → xizmat tanlash ekrani
                  if (tourStep === 0) setTourService(null);
                  setTourStep(tourStep - 1);
                }}
              >
                ← {t("onboarding.back")}
              </button>
              <button className="ob-skip-inline" onClick={endTour}>{t("onboarding.skipStep")}</button>
              <button className="ob-btn primary" onClick={() => setTourStep(tourStep + 1)}>
                {tourStep === list.length - 1 ? `${t("onboarding.finish")} ✓` : `${t("onboarding.next")} →`}
              </button>
            </div>
          </div>
        </>
      )}
    </div>,
    document.body
  );
}
