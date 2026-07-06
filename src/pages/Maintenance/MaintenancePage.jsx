import React, { useState, useEffect } from "react";
import "./Maintenance.css";

const SUPPORT_URL = "https://t.me/StarsjoySupport";
const NEWS_URL = "https://t.me/starsjoy";

export default function MaintenancePage() {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const t = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 600);
    return () => clearInterval(t);
  }, []);

  const openSupport = (e) => {
    e.preventDefault();
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(SUPPORT_URL);
    } else {
      window.open(SUPPORT_URL, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="mt-page">
      <div className="mt-page__particles" aria-hidden="true">
        <div className="mt-particle mt-particle--1" />
        <div className="mt-particle mt-particle--2" />
        <div className="mt-particle mt-particle--3" />
        <div className="mt-particle mt-particle--4" />
        <div className="mt-particle mt-particle--5" />
      </div>

      <div className="mt-page__card">
        <div className="mt-page__brand">
          <span className="mt-page__brand-icon">⭐</span>
          <span className="mt-page__brand-name">Starsjoy</span>
        </div>

        <div className="mt-page__icon">
          <div className="mt-page__ring" />
          <div className="mt-page__ring mt-page__ring--2" />
          <span className="mt-page__gear">⚙️</span>
        </div>

        <h1 className="mt-page__title">Botda texnik ishlar olib borilmoqda</h1>

        <p className="mt-page__desc">
          Hozircha bot orqali stars yoki premium sotib olish vaqtincha mavjud emas
          {dots}
          <br />
          Ishlar tugagach, xizmat avtomatik tiklanadi.
        </p>

        <div className="mt-page__notice">
          <p className="mt-page__notice-title">Shoshilinch kerakmi?</p>
          <p className="mt-page__notice-text">
            Agar sizga <strong>stars</strong> yoki <strong>premium</strong> kerak bo&apos;lsa,
            admin bilan bog&apos;lanishingiz mumkin — shu yerda yozma murojaat qiling:
          </p>
          <a
            href={SUPPORT_URL}
            className="mt-page__support-link"
            onClick={openSupport}
          >
            <span className="mt-page__support-icon">💬</span>
            <span className="mt-page__support-handle">@StarsjoySupport</span>
            <span className="mt-page__support-arrow">→</span>
          </a>
        </div>

        <div className="mt-page__progress" aria-hidden="true">
          <div className="mt-page__progress-glow" />
        </div>

        <div className="mt-page__eta">
          <span className="mt-page__eta-icon">⏳</span>
          <span>Tez orada qaytamiz</span>
        </div>

        <a
          href={NEWS_URL}
          className="mt-page__channel"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="mt-page__channel-icon">📢</span>
          <div className="mt-page__channel-info">
            <span className="mt-page__channel-name">@starsjoy — yangiliklar</span>
            <span className="mt-page__channel-hint">Bot qayta yoqilganda xabar olasiz</span>
          </div>
          <span className="mt-page__channel-arrow">→</span>
        </a>

        <div className="mt-page__actions">
          <a
            href={SUPPORT_URL}
            className="mt-page__btn mt-page__btn--primary"
            onClick={openSupport}
          >
            ✉️ Adminga yozish
          </a>
          <button
            type="button"
            className="mt-page__btn mt-page__btn--ghost"
            onClick={() => window.location.reload()}
          >
            🔄 Qayta tekshirish
          </button>
        </div>

        <p className="mt-page__footer">Starsjoy · Telegram Stars xizmati</p>
      </div>
    </div>
  );
}
