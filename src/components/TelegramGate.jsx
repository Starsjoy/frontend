import React, { useState, useEffect } from "react";
import "./TelegramGate.css";

/**
 * 🛡️ Telegram Gate — sayt faqat Telegram native app ichida ochilsin
 * web.telegram.org, brauzer va boshqa joylardan bloklaydi
 */
export default function TelegramGate({ children }) {
  // 🔧 Development rejimda gate o'chirilgan — to'g'ridan-to'g'ri ilovaga o'tkazadi
  if (import.meta.env.DEV) {
    return children;
  }

  const [isAllowed, setIsAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = () => {
      try {
        // ✅ Agar avvalgi sessionda tekshirilgan bo'lsa, cache dan olamiz
        const cached = sessionStorage.getItem('tg_gate_allowed');
        if (cached !== null) {
          setIsAllowed(cached === 'true');
          setChecking(false);
          return;
        }

        const tg = window?.Telegram?.WebApp;

        // 1) Telegram WebApp mavjudligini tekshirish
        if (!tg) {
          setIsAllowed(false);
          sessionStorage.setItem('tg_gate_allowed', 'false');
          setChecking(false);
          return;
        }

        // 2) initData bo'sh emasligini tekshirish (haqiqiy Telegram sessiya)
        if (!tg.initData || tg.initData.length === 0) {
          setIsAllowed(false);
          sessionStorage.setItem('tg_gate_allowed', 'false');
          setChecking(false);
          return;
        }

        // 3) Platform — web.telegram.org dan ochilganini bloklash
        const platform = tg.platform?.toLowerCase() || "";
        const blockedPlatforms = ["web", "weba"];
        if (blockedPlatforms.includes(platform)) {
          setIsAllowed(false);
          sessionStorage.setItem('tg_gate_allowed', 'false');
          setChecking(false);
          return;
        }

        // ✅ Hammasi to'g'ri — native Telegram app
        setIsAllowed(true);
        sessionStorage.setItem('tg_gate_allowed', 'true');
        setChecking(false);
      } catch {
        setIsAllowed(false);
        sessionStorage.setItem('tg_gate_allowed', 'false');
        setChecking(false);
      }
    };

    // Telegram SDK yuklanishi uchun kutish
    if (window?.Telegram?.WebApp) {
      check();
    } else {
      // SDK hali yuklanmagan bo'lsa, biroz kutish
      const timer = setTimeout(check, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Tekshirilmoqda
  if (checking) {
    return (
      <div className="tg-gate">
        <div className="tg-gate-spinner"></div>
      </div>
    );
  }

  // ✅ Ruxsat berilgan
  if (isAllowed) {
    return children;
  }

  // 🚫 Bloklangan — gate sahifasini ko'rsatish
  return (
    <div className="tg-gate">
      <div className="tg-gate-card">
        {/* Sticker / Rasm */}
        <div className="tg-gate-icon">
          <div className="tg-gate-emoji">
            <span className="tg-emoji-duck">🐤</span>
            <span className="tg-emoji-phone">📱</span>
            <span className="tg-emoji-tg">
              <svg viewBox="0 0 24 24" fill="#2AABEE" width="28" height="28">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.99-1.74 6.65-2.89 7.99-3.45 3.81-1.6 4.6-1.88 5.12-1.89.11 0 .37.03.53.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
              </svg>
            </span>
          </div>
        </div>

        <h2 className="tg-gate-title">
          Telegram ichida ochilganiga ishonch hosil qiling
        </h2>

        {/* Qadamlar */}
        <div className="tg-gate-steps">
          <div className="tg-gate-step">
            <span className="tg-step-num">1</span>
            <span className="tg-step-text">Oynani yoping va qaytadan oching</span>
          </div>
          <div className="tg-gate-step">
            <span className="tg-step-num">2</span>
            <span className="tg-step-text">Sahifani yangilang</span>
          </div>
          <div className="tg-gate-step">
            <span className="tg-step-num">3</span>
            <span className="tg-step-text">Agar ishlamasa, quyidagi tugmani bosing</span>
          </div>
        </div>

        {/* Tugmalar */}
        <div className="tg-gate-buttons">
          <a
            href="https://t.me/StarsjoyBot/starsjoy"
            className="tg-gate-btn tg-gate-btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Telegram'da ochish
          </a>
          <a
            href="https://t.me/starsjoy"
            className="tg-gate-btn tg-gate-btn-secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Yordam
          </a>
        </div>

        <p className="tg-gate-footer">
          Agar muammo davom etsa, support bilan bog'laning
        </p>
      </div>
    </div>
  );
}
