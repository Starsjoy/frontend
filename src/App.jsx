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
import Statistics from "./pages/Statistics/Statistics";
import Discount from "./pages/Discount/Discount";
import Notifications from "./pages/Notifications/Notifications";
import TermsOfService from "./pages/Legal/TermsOfService";
import PrivacyPolicy from "./pages/Legal/PrivacyPolicy";
import MaintenancePage from "./pages/Maintenance/MaintenancePage";
import { LanguageProvider, useTranslation } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { OnboardingProvider } from "./context/OnboardingContext";
import OnboardingTour from "./components/OnboardingTour/OnboardingTour";
import TelegramGate from "./components/TelegramGate";
import LanguageSetup from "./components/LanguageSetup";
import apiFetch from "./utils/apiFetch";

import ErrorBoundary from "./components/ErrorBoundary";

// Yangi foydalanuvchilar uchun til tanlashni ta'minlaydi
function LanguageGate({ children }) {
  const { languageChosen } = useTranslation();
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
      const tgUserId = window?.Telegram?.WebApp?.initDataUnsafe?.user?.id;
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

  if (loaded && maintenance && !isAdminRoute && !isAdmin) {
    return <MaintenancePage />;
  }

  return (
    <ErrorBoundary>
      <TelegramGate>
        <ThemeProvider>
          <LanguageProvider>
            <LanguageGate>
            <OnboardingProvider>
            <BrowserRouter>
              {/* Router ICHIDA — useNavigate/useLocation kerak */}
              <OnboardingTour />
              <Routes>
                <Route path="/" element={<Dashboard/>} />
                <Route path="/stars" element={<UsdtStars />} />
                <Route path="/usdtstars" element={<Navigate to="/stars" replace />} />
                <Route path="/paymeestars" element={<PaymeeStars />} />
                <Route path="/premium" element={<UsdtPremium />} />
                <Route path="/usdtpremium" element={<Navigate to="/premium" replace />} />
                <Route path="/paymeepremium" element={<PaymeePremium />} />
                <Route path="/referral" element={<Referral />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/history" element={<History />} />
                <Route path="/challenges" element={<Challenges />} />
                <Route path="/gift" element={<Gift />} />
                <Route path="/statistics" element={<Statistics />} />
                <Route path="/discount" element={<Discount />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/starsadmin" element={<AdminPanel/>} />
              </Routes>
            </BrowserRouter>
            </OnboardingProvider>
            </LanguageGate>
          </LanguageProvider>
        </ThemeProvider>
      </TelegramGate>
    </ErrorBoundary>
  );
}

export default App;
