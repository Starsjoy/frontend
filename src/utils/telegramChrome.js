import WebApp from "@twa-dev/sdk";

/**
 * Telegram oynasining ranglari (fon, sarlavha, pastki panel). Ilova doim qorong'i
 * temada — hammasi bitta rang. Fon rangi muhim: sahifa chegaradan tortilganda
 * (overscroll) orqadan aynan shu ko'rinadi; oq bo'lsa oq chaqnaydi.
 * Pastki panel (Bot API 7.10+) eski klientlarda yo'q — xato yutiladi.
 */
export const APP_BG = "#1a1a2e";

export function applyTelegramChrome() {
  try { WebApp.setBackgroundColor(APP_BG); } catch { /* eski klient */ }
  try { WebApp.setHeaderColor(APP_BG); } catch { /* eski klient */ }
  try {
    if (typeof WebApp.setBottomBarColor === "function") WebApp.setBottomBarColor(APP_BG);
  } catch { /* Bot API < 7.10 */ }
}
