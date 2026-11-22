import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import UsdtStars from "./pages/UsdtStars/UsdtStars";
import PaymeeStars from "./pages/PaymeeStars/PaymeeStars";
import PaymeePremium from "./pages/PaymeePremium/PaymeePremium";
import AdminPanel from "./pages/Admin/AdminPanel";
import UsdtPremium from "./pages/UsdtPremium/UsdtPremium";
import Dashboard from "./pages/Homepage/Dashboard";
import Referral from "./pages/Referral/Referral";
import Profile from "./pages/Profile/Profile";
import History from "./pages/History/History";
import Challenges from "./pages/Challenges/Challenges";
import Gift from "./pages/Gift/Gift";
import Discount from "./pages/Discount/Discount";
import Notifications from "./pages/Notifications/Notifications";
import TermsOfService from "./pages/Legal/TermsOfService";
import PrivacyPolicy from "./pages/Legal/PrivacyPolicy";
import MaintenancePage from "./pages/Maintenance/MaintenancePage";
import TestPaymentStates from "./pages/Test/TestPaymentStates";
import TestBonus from "./pages/Test/TestBonus";
import Bonus from "./pages/Bonus/Bonus";
import Donat from "./pages/Donat/Donat";
import ModeRoute from "./components/ModeRoute";
import { LanguageProvider, useTranslation } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { OnboardingProvider } from "./context/OnboardingContext";
import OnboardingTour from "./components/OnboardingTour/OnboardingTour";
import TelegramGate from "./components/TelegramGate";
import LanguageSetup from "./components/LanguageSetup";
import apiFetch from "./utils/apiFetch";
import SubscriptionGate from "./components/SubscriptionGate";

import ErrorBoundary from "./components/ErrorBoundary";
import { getTgUser } from "./utils/webSession";

// Donat: donat.starsjoy.uz (istalgan yo'l) yoki /donat — login, til tanlash va obuna
// darvozalarisiz alohida yengil daraxt. Telegram akkaunt kerak emas.
const IS_DONAT_ENTRY =
  window.location.hostname.startsWith("donat.") ||
  window.location.pathname === "/donat" ||
  window.location.pathname.startsWith("/donat/");

// Donat'ga birinchi kirgan mijoz: ?lang= yoki brauzer tili (LanguageProvider shu qiymat bilan boshlanadi)
if (IS_DONAT_ENTRY) {
  try {
    const q = new URLSearchParams(window.location.search).get("lang");
    if (["uz", "ru", "en"].includes(q)) localStorage.setItem("language", q);
    else if (!localStorage.getItem("language") && (navigator.language || "").toLowerCase().startsWith("ru")) {
      localStorage.setItem("language", "ru");
    }
  } catch {
    /* localStorage yopiq */
  }
}

// Yangi foydalanuvchilar uchun til tanlashni ta'minlaydi
function LanguageGate({ children }) {
  const { languageChosen } = useTranslation();
  // /test, /test/* — dizayn sahifalari: til tanlashni chetlab o'tadi
  if (window.location.pathname.startsWith("/test")) return children;
  if (!languageChosen) return <LanguageSetup />;
  return children;
}

function App() {
  const [maintenance, setMaintenance] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    apiFetch("/api/app-config")
      .then((r) => r.json())
      .then((d) => {
        setMaintenance(Boolean(d.maintenance));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    
    // Admin tekshiruvi - Telegram user ID
    try {
      const tgUserId = getTgUser()?.id;
      if (tgUserId) {
        // Admin ID larini .env dan olish (VITE_ADMIN_IDS=123,456,789)
        const adminIds = (import.meta.env.VITE_ADMIN_IDS || '').split(',').map(id => Number(id.trim()));
        if (adminIds.includes(Number(tgUserId))) {
          setIsAdmin(true);
        }
      }
    } catch (err) {
      console.error("Admin check error:", err);
    }
  }, []);

  // Admin panel va admin foydalanuvchilar uchun maintenance ko'rsatilmaydi
  const isAdminRoute = window.location.pathname === "/starsadmin";
  const isTestRoute = window.location.pathname.startsWith("/test");

  if (loaded && maintenance && !isAdminRoute && !isTestRoute && !isAdmin) {
    return <MaintenancePage />;
  }

  if (IS_DONAT_ENTRY) {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <LanguageProvider>
            <BrowserRouter>
              <Routes>
                <Route path="*" element={<Donat />} />
              </Routes>
            </BrowserRouter>
          </LanguageProvider>
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <TelegramGate>
        <ThemeProvider>
          <LanguageProvider>
            <LanguageGate>
            <OnboardingProvider>
            <SubscriptionGate>
            <BrowserRouter>
              {/* Router ICHIDA — useNavigate/useLocation kerak */}
              <OnboardingTour />
              <Routes>
                <Route path="/" element={<Dashboard/>} />
                <Route path="/stars" element={<ModeRoute kind="stars"><UsdtStars /></ModeRoute>} />
                <Route path="/usdtstars" element={<Navigate to="/stars" replace />} />
                <Route path="/paymeestars" element={<PaymeeStars />} />
                <Route path="/premium" element={<ModeRoute kind="premium"><UsdtPremium /></ModeRoute>} />
                <Route path="/usdtpremium" element={<Navigate to="/premium" replace />} />
                <Route path="/paymeepremium" element={<PaymeePremium />} />
                <Route path="/referral" element={<Referral />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/history" element={<History />} />
                <Route path="/challenges" element={<Challenges />} />
                <Route path="/gift" element={<Gift />} />
                <Route path="/discount" element={<Discount />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/starsadmin" element={<AdminPanel/>} />
                <Route path="/test" element={<TestPaymentStates />} />
                <Route path="/test/bonus" element={<TestBonus />} />
                <Route path="/bonus" element={<Bonus />} />
                <Route path="/donat" element={<Donat />} />
              </Routes>
            </BrowserRouter>
            </SubscriptionGate>
            </OnboardingProvider>
            </LanguageGate>
          </LanguageProvider>
        </ThemeProvider>
      </TelegramGate>
    </ErrorBoundary>
  );
}

export default App;
