// Dashboard ichidagi ba'zi bo'limlar (Profil, Chegirma) alohida <iframe>
// hujjatida yuklanadi. Telegram'ning telegram-web-app.js skripti faqat
// ENG TASHQI (top-level) hujjatga --tg-safe-area-inset-*/--tg-content-
// safe-area-inset-* qiymatlarini qo'yadi — ichki iframe buni hech qachon
// o'z-o'zidan olmaydi. Shu sabab asosiy oyna (haqiqiy qiymatlarga ega)
// bu qiymatlarni iframe'larga postMessage orqali yetkazadi.

const CHANNEL = "sj-tg-safe-area";

function readSafeArea() {
  const cs = getComputedStyle(document.documentElement);
  return {
    top: cs.getPropertyValue("--tg-safe-top").trim() || "0px",
    bottom: cs.getPropertyValue("--tg-safe-bottom").trim() || "0px",
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
