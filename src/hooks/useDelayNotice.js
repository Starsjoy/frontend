import { useEffect, useState } from "react";
import apiFetch from "../utils/apiFetch";

/**
 * Admin panel → Sozlamalar → "Kechikish ogohlantirishi" switchi.
 * Yoqilganda mijozga "buyurtma 12 soatgacha kechikishi mumkin" ko'rsatiladi.
 *
 * Qiymat har yuklanishda /api/app-config dan keladi (build'ga yopishtirilmaydi),
 * shuning uchun admin switchi darhol ishlaydi. Bir nechta komponent bir vaqtda
 * so'ramasin — 30 soniyalik umumiy kesh.
 *
 * Lokal dev: `?delay=1` URL parametri switch'siz ko'rinishni sinash uchun
 * (faqat `npm run dev` da — production build'da bu kod yo'q).
 */

const TTL_MS = 30_000;
let cache = null;
let cacheAt = 0;
let inflight = null;

function devOverride() {
  if (!import.meta.env.DEV) return null;
  try {
    const q = new URLSearchParams(window.location.search).get("delay");
    if (q === "1") sessionStorage.setItem("dev_delay_notice", "1");
    if (q === "0") sessionStorage.removeItem("dev_delay_notice");
    return sessionStorage.getItem("dev_delay_notice") === "1" ? true : null;
  } catch {
    return null;
  }
}

function load() {
  if (cache !== null && Date.now() - cacheAt < TTL_MS) return Promise.resolve(cache);
  if (!inflight) {
    inflight = apiFetch("/api/app-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        cache = Boolean(cfg?.delay_notice);
        cacheAt = Date.now();
        return cache;
      })
      .catch(() => cache ?? false)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useDelayNotice() {
  const forced = devOverride();
  const [on, setOn] = useState(() => forced ?? cache ?? false);

  useEffect(() => {
    if (forced) return undefined;
    let alive = true;
    load().then((v) => {
      if (alive) setOn(Boolean(v));
    });
    return () => {
      alive = false;
    };
  }, [forced]);

  return forced ?? on;
}

export default useDelayNotice;
