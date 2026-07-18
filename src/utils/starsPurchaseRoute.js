/** GET /api/app-config javobidan stars/premium sahifa yo'llari */
export function getStarsPurchasePath(config) {
  return config?.stars_purchase_path || "/stars";
}

export function getPremiumPurchasePath(config) {
  return config?.premium_purchase_path || "/premium";
}

export function isFragmentStarsMode(config) {
  return config?.stars_purchase_mode === "fragment";
}

export function isFragmentPremiumMode(config) {
  return config?.stars_purchase_mode === "fragment";
}

export function isPaymeeMode(config) {
  return config?.stars_purchase_mode === "paymee";
}

/** Karta to'lov + tashqi yetkazish (Fragment yoki Paymee) */
export function isCardDeliveryVariant(variant) {
  return variant === "fragment" || variant === "paymee";
}

export function starsApiPrefix(variant) {
  if (variant === "paymee") return "/api/paymee-stars";
  return "/api/usdt-stars";
}

export function premiumApiPrefix(variant) {
  if (variant === "paymee") return "/api/paymee-premium";
  return "/api/usdt-premium";
}

export function getFragmentPaymentLabel(config) {
  if (config?.fragment_payment_label) return config.fragment_payment_label;
  return config?.fragment_payment_method === "usdt_ton" ? "USDT TON" : "TON";
}
