import { useCallback, useEffect, useState } from "react";
import apiFetch from "../utils/apiFetch";
import "./SubscriptionGate.css";
import { getTgUser } from "../utils/webSession";

/**
 * 📢 Majburiy kanal obunasi ekrani (admin switch: force_subscription).
 *
 * • Ochilganda /api/subscription-status so'raladi; obuna bo'lmagan user faqat shu ekranni ko'radi.
 * • Buyurtma paytida backend 403 SUBSCRIPTION_REQUIRED qaytarsa ham (apiFetch event) ekran chiqadi.
 * • Server javob bermasa — ekran ko'rsatilmaydi (savdo to'xtamasin).
 * • Admin sahifasi, /test va adminlar uchun ko'rsatilmaydi.
 */
const TEXT = {
  uz: {
    title: "Rasmiy kanalimizga obuna bo'ling",
    desc: "Botdan foydalanish uchun kanalimizga obuna bo'ling. Yangiliklar, aksiyalar va muhim xabarlar shu yerda.",
    join: "📢 Kanalga o'tish",
    check: "✅ Obuna bo'ldim",
    checking: "Tekshirilmoqda...",
    notYet: "Hali obuna bo'lmagansiz. Kanalga qo'shilib, qayta bosing.",
  },
  ru: {
    title: "Подпишитесь на наш официальный канал",
    desc: "Чтобы пользоваться ботом, подпишитесь на наш канал. Там новости, акции и важные сообщения.",
    join: "📢 Перейти в канал",
    check: "✅ Я подписался",
    checking: "Проверяем...",
    notYet: "Вы ещё не подписаны. Подпишитесь на канал и нажмите снова.",
  },
  en: {
    title: "Subscribe to our official channel",
    desc: "To use the bot, please subscribe to our channel. News, deals and important updates are posted there.",
    join: "📢 Open channel",
    check: "✅ I've subscribed",
    checking: "Checking...",
    notYet: "You're not subscribed yet. Join the channel and tap again.",
  },
};

function pickLang() {
  try {
    const saved = (localStorage.getItem("language") || localStorage.getItem("lang") || "").toLowerCase();
    if (TEXT[saved]) return saved;
  } catch {
    /* localStorage yopiq */
  }
  const code = (getTgUser()?.language_code || "uz").toLowerCase();
  if (code.startsWith("uz")) return "uz";
  if (["ru", "uk", "be", "kk"].includes(code)) return "ru";
  return "en";
}

function isExempt() {
  const path = window.location.pathname;
  if (path === "/starsadmin" || path.startsWith("/test")) return true;
  try {
    const id = Number(getTgUser()?.id);
    const admins = (import.meta.env.VITE_ADMIN_IDS || "").split(",").map((x) => Number(x.trim()));
    return Boolean(id) && admins.includes(id);
  } catch {
    return false;
  }
}

export default function SubscriptionGate({ children }) {
  const [blocked, setBlocked] = useState(false);
  const [url, setUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet] = useState(false);
  const t = TEXT[pickLang()];

  const check = useCallback(async (manual = false) => {
    if (isExempt()) return;
    if (manual) setChecking(true);
    try {
      const r = await apiFetch("/api/subscription-status", { cache: "no-store" });
      if (!r.ok) return; // server xatosi — bloklamaymiz
      const d = await r.json();
      if (d.channel_url) setUrl(d.channel_url);
      const isBlocked = Boolean(d.required && !d.subscribed);
      setBlocked(isBlocked);
      if (manual) setNotYet(isBlocked);
    } catch {
      /* tarmoq xatosi — bloklamaymiz */
    } finally {
      if (manual) setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
    const onRequired = (e) => {
      if (isExempt()) return;
      if (e?.detail?.channel_url) setUrl(e.detail.channel_url);
      setBlocked(true);
    };
    // Kanaldan qaytganda avtomatik qayta tekshirish
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    window.addEventListener("subscription-required", onRequired);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("subscription-required", onRequired);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check]);

  if (!blocked) return children;

  const openChannel = () => {
    if (!url) return;
    const tg = window.Telegram?.WebApp;
    if (tg?.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="sg-page">
      <div className="sg-card">
        <div className="sg-icon" aria-hidden="true">📢</div>
        <h1 className="sg-title">{t.title}</h1>
        <p className="sg-desc">{t.desc}</p>
        <button type="button" className="sg-btn sg-btn--primary" onClick={openChannel}>
          {t.join}
        </button>
        <button type="button" className="sg-btn" onClick={() => check(true)} disabled={checking}>
          {checking ? t.checking : t.check}
        </button>
        {notYet && !checking && <p className="sg-note">{t.notYet}</p>}
      </div>
    </div>
  );
}
