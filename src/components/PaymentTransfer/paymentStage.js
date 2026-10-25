// Sahifa/backend statuslarini 5 ta ekran holatiga moslash
const STAGE_BY_STATUS = {
  pending: "pending",
  payment_received: "received",
  processing: "received",
  completed: "received", // Gift/Discount: to'lov tasdiqlandi, yuborilmoqda
  stars_sent: "success",
  premium_sent: "success",
  gift_sent: "success",
  failed: "failed",
  error: "failed",
  expired: "expired",
};

export const toStage = (status) => STAGE_BY_STATUS[status] || null;

// Polling javobini sahifa statusiga qo'llash. Backend "pending" = to'lov hali
// kelmagan: karta ekrani (payment_info) foydalanuvchi "To'lov qildim" bosmaguncha
// ochiq qoladi, vaqt tugagan (expired) holat ham qaytib ochilmaydi. Tekshiruv
// ekraniga faqat "To'lov qildim" yoki backend to'lovni aniqlaganda o'tiladi.
export const resolvePolledStatus = (current, polled) =>
  polled === "pending" && current !== "pending" ? current : polled;
