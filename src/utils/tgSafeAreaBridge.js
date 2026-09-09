// Dashboard ichidagi ba'zi bo'limlar (Profil, Chegirma) alohida <iframe>
// hujjatida yuklanadi. Telegram'ning telegram-web-app.js skripti faqat
// ENG TASHQI (top-level) hujjatga --tg-safe-area-inset-*/--tg-content-
// safe-area-inset-* qiymatlarini qo'yadi — ichki iframe buni hech qachon
// o'z-o'zidan olmaydi. Shu sabab asosiy oyna (haqiqiy qiymatlarga ega)
// bu qiymatlarni iframe'larga postMessage orqali yetkazadi.

const CHANNEL = "sj-tg-safe-area";

function toPx(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

// DIQQAT: --tg-safe-top/--tg-safe-bottom o'zlari calc()/var() formulasi
// (theme.css'da aniqlangan) — maxsus xususiyatlarni (custom property)
// getComputedStyle orqali o'qiganda brauzer ICHKI var()/calc()'ni
// HISOBLAMAYDI, formulaning O'ZINI (satr sifatida) qaytaradi. Shu
// formula string holida iframe'ga yuborilsa, u yerda ichki
// --tg-content-safe-area-inset-top kabi o'zgaruvchilar mavjud emasligi
// sababli natija yana 0 bo'lib chiqadi. Shuning uchun Telegram'ning XOM
// (calc'siz, faqat piksel qiymat) o'zgaruvchilarini o'qib, YIG'INDINI
// shu yerning o'zida (JavaScript'da) hisoblab, tayyor piksel qiymatini
// yuboramiz.
function readSafeArea() {
  const cs = getComputedStyle(document.documentElement);
  const safeTop = toPx(cs.getPropertyValue("--tg-safe-area-inset-top"));
  const contentTop = toPx(cs.getPropertyValue("--tg-content-safe-area-inset-top"));
  const safeBottom = toPx(cs.getPropertyValue("--tg-safe-area-inset-bottom"));
  const contentBottom = toPx(cs.getPropertyValue("--tg-content-safe-area-inset-bottom"));
  return {
    top: `${safeTop + contentTop}px`,
    bottom: `${safeBottom + contentBottom}px`,
  };
}

// Faqat ASOSIY oynada (Dashboard) chaqiriladi — berilgan iframe elementiga
// joriy safe-area qiymatlarini yuboradi.
export function broadcastSafeAreaTo(iframeEl) {
  if (!iframeEl || !iframeEl.contentWindow) return;
  const data = readSafeArea();
  try {
    iframeEl.contentWindow.postMessage({ channel: CHANNEL, ...data }, "*");
  } catch {
    // e'tiborsiz qoldiramiz
  }
}

// Asosiy oynada — iframe'lardan kelgan "tayyorman" signaliga javoban
// darhol qiymatlarni yuboradi (timing race'ni oldini olish uchun,
// iframe React ilovasi mount bo'lgach o'zi so'raydi).
export function listenForIframeReadyPings() {
  const onMessage = (event) => {
    if (!event.data || event.data.channel !== CHANNEL || !event.data.ready) return;
    const iframes = document.querySelectorAll("iframe");
    iframes.forEach((f) => {
      if (f.contentWindow === event.source) broadcastSafeAreaTo(f);
    });
  };
  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}

// HAR BIR sahifada (main.jsx orqali, iframe ichida bo'lsa ham bo'lmasa
// ham xavfsiz) chaqiriladi. Iframe ichida bo'lsa, ota oynadan safe-area
// xabarini kutadi va o'z hujjatiga qo'llaydi (CSS'dagi var(--tg-safe-top)
// avtomatik to'g'ri qiymatni oladi, boshqa hech narsani o'zgartirish
// shart emas). Top-level sahifada bo'lsa — hech narsa qilmaydi, chunki
// u haqiqiy qiymatlarni Telegram skriptidan to'g'ridan-to'g'ri oladi.
export function listenForSafeAreaFromParent() {
  if (window.top === window.self) return () => {};

  const onMessage = (event) => {
    const data = event.data;
    if (!data || data.channel !== CHANNEL) return;
    const root = document.documentElement;
    if (data.top) root.style.setProperty("--tg-safe-top", data.top);
    if (data.bottom) root.style.setProperty("--tg-safe-bottom", data.bottom);
  };
  window.addEventListener("message", onMessage);

  try {
    window.parent.postMessage({ channel: CHANNEL, ready: true }, "*");
  } catch {
    // e'tiborsiz qoldiramiz
  }

  return () => window.removeEventListener("message", onMessage);
}
