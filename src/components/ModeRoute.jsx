import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import apiFetch from "../utils/apiFetch";
import { getPremiumPurchasePath, getStarsPurchasePath } from "../utils/starsPurchaseRoute";

/**
 * /stars va /premium: admin tanlagan xarid rejimiga qarab to'g'ri sahifani ochadi.
 * Bot tugmalari, kirish havolalari va eski linklar /stars, /premium ga keladi; rejim "paymee" bo'lsa
 * /paymeestars, /paymeepremium ga o'tkaziladi. Aks holda USDT/Fragment sahifasi (yetkazib bo'lmaydigan
 * stars_usdt buyurtmasi) ochilib qolar edi.
 */
export default function ModeRoute({ kind, children }) {
  const { search, hash } = useLocation();
  const [path, setPath] = useState(null);

  useEffect(() => {
    let alive = true;
    apiFetch("/api/app-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (!alive) return;
        setPath(kind === "premium" ? getPremiumPurchasePath(cfg) : getStarsPurchasePath(cfg));
      })
      // Sozlama olinmasa ham xavfsiz yo'l: Paymee (karta to'lovi + Paymee yetkazishi)
      .catch(() => alive && setPath(kind === "premium" ? "/paymeepremium" : "/paymeestars"));
    return () => {
      alive = false;
    };
  }, [kind]);

  if (!path) return null;
  if (path !== `/${kind}`) return <Navigate to={`${path}${search}${hash}`} replace />;
  return children;
}
