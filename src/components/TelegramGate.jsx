import React, { useCallback, useEffect, useState } from "react";
import LogoWordmark from "./Loaders/LogoWordmark";
import {
  exchangeCode,
  isInTelegram,
  loadWebUser,
  openExternal,
  requestHandoff,
  telegramLoginUrl,
} from "../utils/webSession";
import "./TelegramGate.css";

/**
 * Kirish darvozasi — ilova ikki joyda ishlaydi:
 *
 *  • Telegram Mini App: admin panelda "Saytga o'tkazish" yoqilgan bo'lsa, mijozni tanib,
 *    brauzerdagi saytga (app.starsjoy.uz) bir martalik havola bilan o'tkazadi — Telegram
 *    qoidasi bo'yicha xarid Telegram ichida emas, saytda bo'ladi. O'chiq bo'lsa yoki admin
 *    bo'lsa — Mini App avvalgidek ishlaydi.
 *  • Brauzer: /auth?c=... havolasini sessiyaga almashtiradi; sessiya bo'lmasa "Telegram orqali
 *    kirish" ekrani.
 */
const RU = (navigator.language || "").toLowerCase().startsWith("ru");
const T = RU
  ? {
      handedTitle: "Сайт открыт в браузере",
      handedText: "Покупки StarsJoy теперь проходят на сайте. Если браузер не открылся, нажмите кнопку ниже.",
      reopen: "Открыть сайт",
      loginTitle: "Вход в StarsJoy",
      loginText: "Войдите через Telegram — ваш аккаунт определится автоматически, вводить ничего не нужно.",
      login: "Войти через Telegram",
      expired: "Ссылка устарела или уже использована. Войдите ещё раз.",
      help: "Поддержка",
    }
  : {
      handedTitle: "Sayt brauzerda ochildi",
      handedText: "StarsJoy'da xaridlar endi saytda bo'ladi. Brauzer ochilmagan bo'lsa, pastdagi tugmani bosing.",
      reopen: "Saytni ochish",
      loginTitle: "StarsJoy'ga kirish",
      loginText: "Telegram orqali kiring — akkauntingiz o'zi aniqlanadi, hech narsa yozish shart emas.",
      login: "Telegram orqali kirish",
      expired: "Havola eskirgan yoki ishlatilgan. Qaytadan kiring.",
      help: "Yordam",
    };

const TgIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
    <path d="M21.4 4.6 2.9 11.8c-1.2.5-1.2 1.2-.2 1.5l4.7 1.5 1.8 5.5c.2.6.4.8.9.8.4 0 .6-.2.8-.4l2.3-2.2 4.8 3.5c.9.5 1.5.2 1.7-.8l3.1-14.7c.3-1.3-.5-1.8-1.4-1.4ZM8.9 14.4l8.6-5.4c.4-.3.8-.1.5.2l-7 6.4-.3 3.1z" />
  </svg>
);

function startParam() {
  try {
    return window.Telegram?.WebApp?.initDataUnsafe?.start_param || "";
  } catch {
    return "";
  }
}

export default function TelegramGate({ children }) {
  // 🔧 Development: to'g'ridan-to'g'ri ilova (lokal sinov)
  const dev = import.meta.env.DEV;
  const [state, setState] = useState(dev ? "app" : "checking"); // checking | app | handed | login | blocked
  const [note, setNote] = useState("");

  const handoff = useCallback(async (force) => {
    const d = await requestHandoff({ path: window.location.pathname, force });
    if (d?.skip || !d?.url) return false;
    openExternal(d.url);
    return true;
  }, []);

  useEffect(() => {
    if (dev) return;
    let alive = true;
    const set = (s) => alive && setState(s);

    (async () => {
      const embedded = window.top !== window; // Dashboard ichidagi iframe sahifalar

      if (isInTelegram()) {
        if (embedded) return set("app");
        const platform = (window.Telegram?.WebApp?.platform || "").toLowerCase();
        try {
          if (await handoff(startParam() === "web")) return set("handed");
        } catch (e) {
          console.warn("Handoff:", e?.message || e); // backend xatosi — mijozni to'xtatmaymiz
        }
        // web.telegram.org — avvalgidek bloklanadi (Mini App faqat telefon/kompyuter ilovasida)
        return set(platform === "web" || platform === "weba" ? "blocked" : "app");
      }

      // Brauzer
      const url = new URL(window.location.href);
      if (url.pathname === "/auth" && url.searchParams.get("c")) {
        const next = url.searchParams.get("next") || "/";
        try {
          await exchangeCode(url.searchParams.get("c"));
          window.history.replaceState(null, "", /^\/[A-Za-z0-9/_-]*$/.test(next) ? next : "/");
          return set("app");
        } catch {
          window.history.replaceState(null, "", "/");
          // Havola eskirgan bo'lsa ham, avvalgi sessiya bo'lishi mumkin
          if (await loadWebUser()) return set("app");
          if (alive) setNote(T.expired);
          return set("login");
        }
      }
      return set((await loadWebUser()) ? "app" : "login");
    })();

    return () => {
      alive = false;
    };
  }, [dev, handoff]);

  if (state === "app") return children;

  if (state === "checking") {
    return (
      <div className="tg-gate">
        <LogoWordmark size={120} />
      </div>
    );
  }

  if (state === "handed") {
    return (
      <div className="tg-gate">
        <div className="tg-gate-card">
          <LogoWordmark size={120} />
          <h2 className="tg-gate-title tg-gate-title--mt">{T.handedTitle}</h2>
          <p className="tg-gate-text">{T.handedText}</p>
          <div className="tg-gate-buttons">
            <button
              type="button"
              className="tg-gate-btn tg-gate-btn-primary"
              onClick={() => handoff(true).catch(() => {})}
            >
              {T.reopen}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === "login") {
    return (
      <div className="tg-gate">
        <div className="tg-gate-card">
          <LogoWordmark size={120} />
          <h2 className="tg-gate-title tg-gate-title--mt">{T.loginTitle}</h2>
          <p className="tg-gate-text">{T.loginText}</p>
          {note && <p className="tg-gate-note">{note}</p>}
          <div className="tg-gate-buttons">
            <a href={telegramLoginUrl()} className="tg-gate-btn tg-gate-btn-primary tg-gate-btn-icon">
              <TgIcon />
              {T.login}
            </a>
            <a
              href="https://t.me/StarsjoySupport"
              className="tg-gate-btn tg-gate-btn-secondary"
              target="_blank"
              rel="noopener noreferrer"
            >
              {T.help}
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 🚫 web.telegram.org — Telegram ilovasida ochish kerak
  return (
    <div className="tg-gate">
      <div className="tg-gate-card">
        <div className="tg-gate-icon">
          <div className="tg-gate-emoji">
            <span className="tg-emoji-duck">🐤</span>
            <span className="tg-emoji-phone">📱</span>
          </div>
        </div>
        <h2 className="tg-gate-title">Telegram ichida ochilganiga ishonch hosil qiling</h2>
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
            href="https://t.me/StarsjoySupport"
            className="tg-gate-btn tg-gate-btn-secondary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Yordam
          </a>
        </div>
        <p className="tg-gate-footer">Agar muammo davom etsa, support bilan bog'laning</p>
      </div>
    </div>
  );
}
