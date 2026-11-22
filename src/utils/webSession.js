/**
 * Ilova ikki joyda ishlaydi:
 *  - Telegram Mini App (initData bilan),
 *  - brauzer — app.starsjoy.uz (sessiya cookie, backend modules/webAuth).
 *
 * Foydalanuvchi ma'lumotini har doim shu yerdan oling (getTgUser), to'g'ridan-to'g'ri
 * window.Telegram.WebApp.initDataUnsafe.user dan emas — brauzerda u bo'sh bo'ladi.
 */
import apiFetch from "./apiFetch";

let webUser = null;

export const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || "StarsjoyBot";

export function isInTelegram() {
  try {
    return Boolean(window.Telegram?.WebApp?.initData);
  } catch {
    return false;
  }
}

export function getTgUser() {
  try {
    const u = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (u?.id) return u;
  } catch {
    /* brauzer */
  }
  return webUser;
}

export function setWebUser(user) {
  webUser = user || null;
}

/** Brauzer sessiyasi: foydalanuvchi yoki null */
export async function loadWebUser() {
  try {
    const r = await apiFetch("/api/web-auth/me");
    if (!r.ok) return null;
    const d = await r.json();
    setWebUser(d?.user);
    return d?.user || null;
  } catch {
    return null;
  }
}

/** Bir martalik havoladagi kodni sessiyaga almashtirish */
export async function exchangeCode(code) {
  const r = await apiFetch("/api/web-auth/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d?.user) throw new Error(d?.code || "EXCHANGE_FAILED");
  setWebUser(d.user);
  return d.user;
}

/** Mini App → saytga o'tish havolasi. { skip: true } bo'lsa Mini App avvalgidek ishlaydi. */
export async function requestHandoff({ path = "/", force = false } = {}) {
  const r = await apiFetch("/api/web-auth/handoff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, force }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.error || "HANDOFF_FAILED");
  return d;
}

/** Tashqi brauzerda ochish (Telegram ichida openLink, aks holda oddiy o'tish) */
export function openExternal(url) {
  const tg = window.Telegram?.WebApp;
  try {
    if (tg?.openLink && tg.initData) {
      tg.openLink(url, { try_instant_view: false });
      return;
    }
  } catch {
    /* pastdagi yo'l */
  }
  window.location.href = url;
}

/** Saytdan "Telegram orqali kirish": botning Mini App'i ochiladi va saytga qaytaradi */
export function telegramLoginUrl() {
  return `https://t.me/${BOT_USERNAME}/starsjoy?startapp=web`;
}

export async function logoutWeb() {
  try {
    await apiFetch("/api/web-auth/logout", { method: "POST" });
  } catch {
    /* baribir chiqamiz */
  }
  setWebUser(null);
}
