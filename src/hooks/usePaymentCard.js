import { useEffect, useState } from "react";
import apiFetch from "../utils/apiFetch";

/**
 * Mijozga ko'rsatiladigan to'lov kartasi.
 *
 * ⚠️ Nega hook, nega `import.meta.env` emas: VITE_* qiymatlari build paytida
 *    bundle ichiga yopishtiriladi. Admin panel switchi (UZCARD ⇄ HUMO) ishlashi
 *    uchun karta HAR YUKLANISHDA serverdan kelishi kerak — aks holda kartani
 *    almashtirgandan keyin frontend'ni qayta build qilish kerak bo'lardi.
 *
 * Zaxira: API javob bermasa yoki hali yuklanmagan bo'lsa eski VITE_ qiymatlari
 * ishlatiladi — ya'ni to'lov ekrani hech qachon bo'sh qolmaydi.
 */

const FALLBACK = {
  number: import.meta.env.VITE_CARD_NUMBER || "",
  name: import.meta.env.VITE_CARD_NAME || "",
  brand: "uzcard",
  title: "UZCARD",
};

/** Bitta yuklash hamma sahifaga yetadi (4 ta sahifa alohida so'ramasin) */
let cache = null;
let inflight = null;

function normalize(cfg) {
  const number = String(cfg?.payment_card_number || "").trim();
  if (!number) return { ...FALLBACK };
  return {
    number,
    // Ko'rsatish uchun 4 talab ajratilgan ko'rinish; server bermasa o'zimiz ajratamiz
    display: String(cfg.payment_card_display || "").trim() || groupDigits(number),
    name: String(cfg.payment_card_name || "").trim() || FALLBACK.name,
    brand: String(cfg.payment_brand || "uzcard").trim(),
    title: String(cfg.payment_card_title || "").trim() || "KARTA",
  };
}

function groupDigits(v) {
  const d = String(v ?? "").replace(/\D/g, "");
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function withDisplay(card) {
  return { ...card, display: card.display || groupDigits(card.number) };
}

async function loadCard() {
  if (cache) return cache;
  if (!inflight) {
    inflight = apiFetch("/api/app-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        cache = normalize(cfg);
        return cache;
      })
      .catch(() => withDisplay({ ...FALLBACK }))
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Karta yangilanganda (admin switch) keshni tozalash uchun */
export function invalidatePaymentCard() {
  cache = null;
}

export function usePaymentCard() {
  const [card, setCard] = useState(() => cache || withDisplay({ ...FALLBACK }));

  useEffect(() => {
    let alive = true;
    loadCard().then((c) => {
      if (alive && c) setCard(c);
    });
    return () => {
      alive = false;
    };
  }, []);

  return card;
}

export default usePaymentCard;
