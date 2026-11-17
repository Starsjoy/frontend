/**
 * 🛡️ SECURITY: Xavfsiz API fetch wrapper
 * 
 * Har bir API so'roviga Telegram WebApp initData ni avtomatik qo'shadi.
 * Bu backendda foydalanuvchi haqiqiyligini tekshirish uchun kerak.
 */

// Production: relative paths (/api/...) — Nginx proxy ishlaydi
// Development: http://localhost:5001 — local backend
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default async function apiFetch(url, options = {}) {
  const initData = window?.Telegram?.WebApp?.initData || '';
  
  // Full URL yoki relative URL'ni VITE_API_URL bilan birlashtir
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 30000); // 30s timeout

  const headers = {
    ...options.headers,
  };

  // initData mavjud bo'lsa, headerga qo'shamiz
  if (initData) {
    headers['X-Telegram-Init-Data'] = initData;
  }

  const fetchOptions = {
    ...options,
    headers,
    signal: controller.signal,
  };

  try {
    const response = await fetch(fullUrl, fetchOptions);
    // Majburiy kanal obunasi: backend buyurtmani rad etsa — obuna ekranini ko'rsatamiz
    if (response.status === 403) {
      response.clone().json().then((d) => {
        if (d?.code === "SUBSCRIPTION_REQUIRED") {
          window.dispatchEvent(new CustomEvent("subscription-required", { detail: d }));
        }
      }).catch(() => {});
    }
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}
