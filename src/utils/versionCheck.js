// Ilova versiyasini kuzatish — Telegram mini app'ni fon rejimida ochib
// turgan foydalanuvchi eski JS bundle'ni xotirada saqlab qolishi mumkin
// (to'liq sahifa qayta yuklanmagani uchun yangi deploy'lar ko'rinmaydi).
// Mini app qayta faollashganda (foydalanuvchi uni qayta ochganda)
// index.html'ni qayta so'rab, bundle hash'i o'zgarganini aniqlaymiz va
// shunda avtomatik reload qilamiz.

let initialBundleSrc = null;
let checking = false;

function getBundleSrc(htmlOrDocument) {
  if (typeof htmlOrDocument === "string") {
    const match = htmlOrDocument.match(
      /<script[^>]+type="module"[^>]+src="([^"]+)"/
    );
    return match ? match[1] : null;
  }
  const script = document.querySelector(
    'script[type="module"][src*="/assets/"]'
  );
  return script ? script.getAttribute("src") : null;
}

async function checkForNewVersion() {
  if (checking || !initialBundleSrc) return;
  checking = true;
  try {
    const res = await fetch("/index.html", { cache: "no-store" });
    if (res.ok) {
      const html = await res.text();
      const latestSrc = getBundleSrc(html);
      if (latestSrc && latestSrc !== initialBundleSrc) {
        window.location.reload();
      }
    }
  } catch {
    // Tarmoq xatosi — jim o'tkazib yuboramiz, keyingi urinishda qayta tekshiramiz
  } finally {
    checking = false;
  }
}

export function initVersionCheck() {
  initialBundleSrc = getBundleSrc(document);
  if (!initialBundleSrc) return;

  const onVisible = () => {
    if (document.visibilityState === "visible") checkForNewVersion();
  };

  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", checkForNewVersion);

  // Uzoq ochiq turgan sessiyalar uchun qo'shimcha xavfsizlik — har 3 daqiqada
  const interval = setInterval(() => {
    if (document.visibilityState === "visible") checkForNewVersion();
  }, 3 * 60 * 1000);

  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", checkForNewVersion);
    clearInterval(interval);
  };
}
