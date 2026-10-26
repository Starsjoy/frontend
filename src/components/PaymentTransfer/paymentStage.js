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
  delayed: "delayed", // to'lov qabul qilindi, yetkazish kechikdi — admin qo'lda yuboradi
};

// Pul kelgandan keyingi holatlar — bularda 8 daqiqalik taymer to'xtatiladi
// (aks holda to'lagan userga "vaqt tugadi" chiqib qolardi)
const PAID_STATUSES = [
  "payment_received", "processing", "delayed", "completed",
  "stars_sent", "premium_sent", "gift_sent", "failed", "error",
];
export const isPaidStatus = (status) => PAID_STATUSES.includes(status);

// Backend javobidan sahifa statusi: yetkazish kechikkan (delayed=true) bo'lsa — "delayed"
export const polledStatusOf = (data) =>
  data?.delayed && ["payment_received", "processing"].includes(data?.status) ? "delayed" : data?.status;

export const toStage = (status) => STAGE_BY_STATUS[status] || null;

// Polling javobini sahifa statusiga qo'llash. Backend "pending" = to'lov hali
// kelmagan: karta ekrani (payment_info) foydalanuvchi "To'lov qildim" bosmaguncha
// ochiq qoladi, vaqt tugagan (expired) holat ham qaytib ochilmaydi. Tekshiruv
// ekraniga faqat "To'lov qildim" yoki backend to'lovni aniqlaganda o'tiladi.
export const resolvePolledStatus = (current, polled) =>
  polled === "pending" && current !== "pending" ? current : polled;
