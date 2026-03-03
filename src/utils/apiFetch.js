/**
 * 🛡️ SECURITY: Xavfsiz API fetch wrapper
 * 
 * Har bir API so'roviga Telegram WebApp initData ni avtomatik qo'shadi.
 * Bu backendda foydalanuvchi haqiqiyligini tekshirish uchun kerak.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export default function apiFetch(url, options = {}) {
  const initData = window?.Telegram?.WebApp?.initData || '';
  
  // Full URL yoki relative URL'ni VITE_API_URL bilan birlashtir
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  const headers = {
    ...options.headers,
  };

  // initData mavjud bo'lsa, headerga qo'shamiz
  if (initData) {
    headers['X-Telegram-Init-Data'] = initData;
  }

  return fetch(fullUrl, {
    ...options,
    headers,
  });
}
