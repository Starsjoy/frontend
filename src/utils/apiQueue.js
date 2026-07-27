/**
 * 🧵 Simple per-key sequential task queue.
 *
 * Ishlatilishi:
 *   import { queued, cancelQueue } from "../../utils/apiQueue";
 *   await queued("admin:transactions", () => apiFetch("/api/..."));
 *
 * Bir xil `key` bilan chaqirilgan tasklar navbat bilan (ketma-ket) ishlaydi —
 * shu bilan admin panel yuklanganda 3-4 request paralell yuborilmaydi,
 * balki bittadan sekin-sekin bajariladi. Bu backendni bosh urishdan
 * saqlaydi va renderni ham pog'ona-pog'ona qilib beradi.
 *
 * Har xil `key` — mustaqil navbat (masalan, stars, gift, premium alohida).
 */

const queues = new Map();

/**
 * @param {string} key Navbat kaliti (masalan, "admin:transactions")
 * @param {() => Promise<any>} task Asinxron funksiya
 * @returns {Promise<any>} task natijasi
 */
export function queued(key, task) {
  const prev = queues.get(key) || Promise.resolve();
  const next = prev
    .catch(() => {}) // avvalgi xato bu taskni to'xtatmasin
    .then(() => task());

  // xotira leaki bo'lmasin: shu task oxirgisi bo'lsa, mapdan tozalash
  const stored = next.finally(() => {
    if (queues.get(key) === stored) queues.delete(key);
  });
  queues.set(key, stored);
  return next;
}

/**
 * Navbatni tozalash (masalan, tab almashganda pending pipeline kerak emas).
 * Muhim: bu ishlab bo'lgan Promise-larni to'xtatmaydi — shunchaki keyingi
 * task'lar uchun chain reset qilinadi.
 */
export function cancelQueue(key) {
  queues.delete(key);
}
