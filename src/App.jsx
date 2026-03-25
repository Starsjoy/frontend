import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import Home from "./pages/Stars/Stars";
import AdminPanel from "./pages/Admin/AdminPanel";
import Premium from "./pages/Premium/Premium";
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
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import TelegramGate from "./components/TelegramGate";
import apiFetch from "./utils/apiFetch";

function App() {
  const [maintenance, setMaintenance] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    apiFetch("/api/maintenance")
      .then(r => r.json())
      .then(d => { setMaintenance(d.maintenance); setLoaded(true); })
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
    <TelegramGate>
      <ThemeProvider>
        <LanguageProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Dashboard/>} />
              <Route path="/stars" element={<Home />} />
              <Route path="/premium" element={<Premium />} />
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
        </LanguageProvider>
      </ThemeProvider>
    </TelegramGate>
  );
}

export default App;
