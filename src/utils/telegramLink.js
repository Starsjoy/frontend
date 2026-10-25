/**
 * Telegram havolasini ochish — iframe ichidan ham ishlaydi.
 *
 * Profil, Bonuslar kabi bo'limlar Dashboard ichidagi <iframe>da yuklanadi. iframe'dagi
 * Telegram.WebApp buyruqlari Telegram'ga yetib bormaydi (jimgina hech narsa bo'lmaydi),
 * shuning uchun buyruq ota oynadagi (bir xil origin) Telegram.WebApp orqali yuboriladi.
 */
function getTelegramWebApp() {
  try {
    if (window.parent && window.parent !== window && window.parent.Telegram?.WebApp) {
      return window.parent.Telegram.WebApp;
    }
  } catch {
    /* boshqa origin — o'zimizniki bilan davom etamiz */
  }
  return window.Telegram?.WebApp || null;
}

export function openTelegramLink(url) {
  const tg = getTelegramWebApp();
  try {
    if (tg?.openTelegramLink && tg.initData) {
      tg.openTelegramLink(url);
      return;
    }
  } catch {
    /* pastdagi zaxira yo'l */
  }
  window.open(url, "_blank");
}
