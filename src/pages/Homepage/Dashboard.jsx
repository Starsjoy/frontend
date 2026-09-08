import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import WebApp from "@twa-dev/sdk";
import { useTranslation } from "../../context/LanguageContext";
import { useOnboarding } from "../../context/OnboardingContext";
import apiFetch from "../../utils/apiFetch";
import {
  getStarsPurchasePath,
  getPremiumPurchasePath,
} from "../../utils/starsPurchaseRoute";
import { BookOpen, Headset } from "lucide-react";
import { TGSSticker } from "../../components/TGSSticker";
import BonusModal from "../../components/BonusModal";
import StarsJoyLogoStatic from "../../components/Loaders/StarsJoyLogoStatic";
import LogoWordmark from "../../components/Loaders/LogoWordmark";
import StarOutlineLoader from "../../components/Loaders/StarOutlineLoader";
import "./Dashboard.css";

import starsGif from "../../assets/stars.gif";
import premiumGif from "../../assets/premium_gif.gif";
import ayiqImg from "../../assets/ayiqyurakchali.jpg";
import actionCardSticker from "../../assets/5800655655995968830.tgs";
import tilSticker from "../../assets/AnimatedSticker_til.tgs";
import referalSticker from "../../assets/AnimatedSticker_ref.tgs";
import ordersIcon from "../../assets/orders_icon.png";
import profileIcon from "../../assets/profile_icon.png";
import menuIcon from "../../assets/main_icon.png";
import discountIcon from "../../assets/discount_icon.png";


// ================== UTILS ==================
const formatAmount = (num) =>
  Number(num || 0).toLocaleString("ru-RU");

// ================== COMPONENT ==================
export default function Dashboard() {
  const navigate = useNavigate();
  const { t, language, setLanguage, onboardingCompleted } = useTranslation();
  const { startTour, tourActive } = useOnboarding();

  /* ================= USER ================= */
  const [username, setUsername] = useState(null);
  const [userPhoto, setUserPhoto] = useState(null);
  const [isTelegram, setIsTelegram] = useState(false);

  /* ================= DATA ================= */
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [referralBoard, setReferralBoard] = useState([]);
  const [myRefRank, setMyRefRank] = useState(null);
  const [history, setHistory] = useState([]);

  /* ================= UI ================= */
  const [tab, setTab] = useState("home"); // home | referral | profile | history
  const [statsTab, setStatsTab] = useState("sales");
  const [loading, setLoading] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const [splashVisible, setSplashVisible] = useState(() => !sessionStorage.getItem("splashShown"));
  const [splashFading, setSplashFading] = useState(false);
  const [showChannelBanner, setShowChannelBanner] = useState(false);
  const [error, setError] = useState(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [showComingSoonToast, setShowComingSoonToast] = useState(false);
  const [starsPurchasePath, setStarsPurchasePath] = useState("/stars");
  const [premiumPurchasePath, setPremiumPurchasePath] = useState("/premium");

  /* ================= BONUS MISSIYA ================= */
  const [showBonus, setShowBonus] = useState(false);

  /* ================= CHALLENGE ================= */
  const [myTotal, setMyTotal] = useState(0);
  const [referralBalance, setReferralBalance] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const GOAL = 999999;

  const percent = Math.min(
    100,
    Math.round((myTotal / GOAL) * 100)
  );

  // Register user (silent)
  const registerUser = async (user) => {
    try {
      // Check URL parameters for referral code (startapp param in Telegram)
      const params = new URLSearchParams(window.location.search);
      const startParam = WebApp?.initDataUnsafe?.start_param || params.get("startapp") || params.get("ref");

      await apiFetch("/api/referral/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user,
          referral_code: startParam || null,
          language: localStorage.getItem("language") || "uz",
          language_selected: localStorage.getItem("languageChosen") === "1",
        }),
      });
    } catch (err) {
      console.error("Auto-register error:", err);
    }
  };

  const loadPurchasePaths = () => {
    apiFetch("/api/app-config")
      .then((r) => r.json())
      .then((cfg) => {
        setStarsPurchasePath(getStarsPurchasePath(cfg));
        setPremiumPurchasePath(getPremiumPurchasePath(cfg));
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadPurchasePaths();
  }, []);

  useEffect(() => {
    if (tab === "home") loadPurchasePaths();
  }, [tab]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") loadPurchasePaths();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  /* ================= TELEGRAM USER ================= */
  useEffect(() => {
    try {
      WebApp.ready();

      // Ko'k rang o'rnatish (Telegram header va bottom bar uchun)
      const blueColor = "#1a1a2e"; // Dark blue

      WebApp.setHeaderColor(blueColor);
      WebApp.setBackgroundColor(blueColor);
      document.body.style.backgroundColor = blueColor;

      // Telegram expand qilish
      WebApp.expand();

      // Pastga scroll qilganda mini app tasodifan yopilib qolmasligi uchun
      // (fullscreen/expanded rejimda vertikal swipe-close'ni o'chiramiz)
      if (typeof WebApp.disableVerticalSwipes === "function") {
        WebApp.disableVerticalSwipes();
      }


      const tgUser =
        WebApp?.initDataUnsafe?.user?.username ||
        window?.Telegram?.WebApp?.initDataUnsafe?.user?.username;

      const tgUserId =
        WebApp?.initDataUnsafe?.user?.id ||
        window?.Telegram?.WebApp?.initDataUnsafe?.user?.id;

      const tgPhoto =
        WebApp?.initDataUnsafe?.user?.photo_url ||
        window?.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url;

      if (tgUser) {
        const clean = tgUser.replace("@", "");
        setUsername(clean);
        localStorage.setItem("username", clean);
        setIsTelegram(true);
        if (tgPhoto) setUserPhoto(tgPhoto);
        if (tgUserId) localStorage.setItem("userId", String(tgUserId));

        // Auto register
        registerUser(clean);
      }
    } catch {
      setIsTelegram(false);
    }
  }, []);

  /* ================= 🚀 COMBINED DASHBOARD INIT — Bitta so'rovda barcha ma'lumot ================= */
  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const uid = localStorage.getItem("userId");
        const params = new URLSearchParams();
        if (username) params.append("username", username);
        if (uid) params.append("user_id", uid);

        const res = await apiFetch(`/api/dashboard/init?${params.toString()}`);
        if (!res.ok) {
          throw new Error('API request failed');
        }
        const json = await res.json();

        // Leaderboard
        setLeaderboard(json.leaderboard?.top10 || []);
        setMyRank(json.leaderboard?.me || null);

        // Referral leaderboard
        setReferralBoard(json.referralLeaderboard?.top10 || []);
        setMyRefRank(json.referralLeaderboard?.me || null);

        // History
        const orders = json.history || [];
        setHistory(orders);

        // Challenge total
        const total = orders
          .filter(o => ["stars_sent", "premium_sent"].includes(o.status))
          .reduce((s, o) => s + Number(o.amount || 0), 0);
        setMyTotal(total);

        // Referral stats
        setReferralBalance(json.referralStats?.referral_balance || 0);
        setReferralCount(json.referralStats?.total_referrals || 0);

        console.log(`🚀 Dashboard yuklandi: ${json.loadTime}ms`);

      } catch (err) {
        console.error("Dashboard init error:", err);
        setError("Ma'lumotlarni yuklashda xatolik");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [username]);

  /* ================= REFRESH UNREAD NOTIFICATIONS (30s interval) ================= */
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const uid = localStorage.getItem("userId");
        if (!uid) return;
        const res = await apiFetch(`/api/notifications/unread/${uid}`);
        const json = await res.json();
        if (json.success) {
          setUnreadCount(json.unread_count || 0);
        }
      } catch (e) {
        console.error("Unread count error:", e);
      }
    };
    fetchUnreadCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Language confirm function
  const handleLanguageConfirm = () => {
    setLanguage(selectedLanguage);
    setShowLanguageModal(false);
  };

  const handleContactAdmin = () => {
    try {
      WebApp.openTelegramLink("https://t.me/StarsjoySupport");
    } catch {
      window.open("https://t.me/StarsjoySupport", "_blank");
    }
  };

  // Smooth Navigation Handler
  const handleNavClick = (targetTab) => {
    if (tab === targetTab) return;

    // Only show loading for complex tabs (iframes)
    if (targetTab !== 'home') {
       setNavLoading(true);
       setTab(targetTab);

       // Silliq animatsiya uchun delay (white flashni yopish)
       setTimeout(() => {
         setNavLoading(false);
       }, 1500);
    } else {
       // Home is usually fast as it's not an iframe here,
       // but let's give it a small feedback too for consistency or just direct swap
       setTab(targetTab);
    }
  };

  // Back Button Logic
  useEffect(() => {
    const handleBack = () => {
      // Modallar bo'lsa, ularni yopish afzal, lekin bu yerda tabni qaytarish ustuvor
      if (showLanguageModal) {
        setShowLanguageModal(false);
      } else if (tab !== "home") {
        setTab("home");
      }
    };

    try {
      if (tab !== "home" || showLanguageModal) {
        WebApp.BackButton.show();
        WebApp.BackButton.onClick(handleBack);
      } else {
        WebApp.BackButton.hide();
        WebApp.BackButton.offClick(handleBack);
      }
    } catch (e) {
      console.log("WebApp BackButton error:", e);
    }

    return () => {
      try {
        WebApp.BackButton.offClick(handleBack);
      } catch (e) {}
    };
  }, [tab, showLanguageModal]);

  /* ================= SPLASH AUTO-HIDE =================
     Matn shimmeri (sjWordShimmerSweep, 3.6s tsikl) ~2.5s'da to'liq yorqin
     holatga yetadi — undan keyingi qism faqat highlight chizig'ining
     orqasidan xiralashishi, buni kutishning hojati yo'q. Shu sabab splash
     to'liq matn animatsiyasi (3.6s) emas, balki "o'qilishi mumkin" bo'lgan
     ~2.5s nuqtasida yopila boshlaydi — jami ~3s. */
  useEffect(() => {
    if (!splashVisible) return;
    const ANIMATION_CYCLE_MS = 2500;
    const FADE_DURATION_MS = 500; // .splash-screen { transition: opacity 0.5s }
    const fadeTimer = setTimeout(() => setSplashFading(true), ANIMATION_CYCLE_MS);
    const hideTimer = setTimeout(() => {
      setSplashVisible(false);
      sessionStorage.setItem("splashShown", "1");
    }, ANIMATION_CYCLE_MS + FADE_DURATION_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  /* ================= O'RGATUVCHI TUR AVTO-START =================
     Yangi foydalanuvchiga splash tugagach turni ochamiz. */
  useEffect(() => {
    if (splashVisible) return;
    if (onboardingCompleted) return;

    const timer = setTimeout(() => startTour(), 600);
    return () => clearTimeout(timer);
  }, [splashVisible, startTour, onboardingCompleted]);


  /* ================= UI ================= */

  // Splash screen - StarsJoy Loader
  if (splashVisible) {
    return (
      <div className={`splash-screen ${splashFading ? 'fade-out' : ''}`}>
        {/* Aura background */}
        <div className="splash-aura"></div>

        <div className="splash-loader">
          <LogoWordmark size={140} />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-root_dashboard">

      {/* HEADER */}
      <header className="dash-header_dashboard">
        <div className="header-inner_dashboard">
          <h1 className="brand-title_dashboard">
            <StarsJoyLogoStatic size={52} className="brand-logo_dashboard" />
            Starsjoy
          </h1>
          <div className="header-actions_dashboard">
            <button
              className="help-btn-dashboard"
              onClick={startTour}
              title={t("onboarding.guideBtn")}
            >
              <BookOpen size={14} strokeWidth={2.5} />
              <span>{t("onboarding.guideBtn")}</span>
            </button>
            <button
              className="bonus-btn-dashboard"
              onClick={() => setShowBonus(true)}
              title={t("bonus.openTitle")}
              aria-label={t("bonus.openTitle")}
            >
              <span className="bonus-btn-dashboard__icon" role="img" aria-hidden="true">🎁</span>
            </button>
          </div>
        </div>
      </header>

      <BonusModal open={showBonus} onClose={() => setShowBonus(false)} />

      <main className="dash-main_dashboard" style={{display: tab === 'home' ? 'flex' : 'none'}}>
        {/* ACTION CARDS - Stars wide, Gift & Premium side by side */}
        <div className="dashboard-actions-container">
          {/* Stars - Full Width */}
          <div className="action-card-wide" data-tour-id="tour-stars-btn" onClick={() => navigate(starsPurchasePath)}>
            <img src={starsGif} className="action-card-wide__img" alt="stars" />
            <div className="action-card-wide__content">
              <span className="action-card-wide__title">{t("dashboard.buyStars") || "Stars olish"}</span>
            </div>
          </div>

          {/* Gift & Premium - Side by Side */}
          <div className="action-cards-row">
            <div className="action-card-half" data-tour-id="tour-gift-btn" onClick={() => navigate("/gift")}>
              <TGSSticker stickerPath={actionCardSticker} className="action-card-half__img" autoplay={true} loop={true} />
              <span className="action-card-half__title">{t("dashboard.buyGift") || "Gift olish"}</span>
            </div>
            <div className="action-card-half" data-tour-id="tour-premium-btn" onClick={() => navigate(premiumPurchasePath)}>
              <img src={premiumGif} className="action-card-half__img" alt="premium" />
              <span className="action-card-half__title">{t("dashboard.buyPremium") || "Premium olish"}</span>
            </div>
          </div>

          {/* Secondary Actions - Support (ikkinchi darajali) */}
          <div className="secondary-actions-row">
            <div
              className="secondary-action-card"
              onClick={handleContactAdmin}
            >
              <div className="secondary-action-card__icon">
                <Headset size={18} strokeWidth={2} />
              </div>
              <span className="secondary-action-card__text">
                {t("dashboard.contactAdminBanner") || "Admin bilan bog'lanish"}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* BOTTOM NAVIGATION */}
      <div className="bottom-nav_dashboard">
        <button
          className={`nav-btn_dashboard ${tab === "home" ? "active" : ""}`}
          onClick={() => handleNavClick("home")}
          title={t("dashboard.home")}
        >
          <div className="nav-icon">
            <img src={menuIcon} alt="Home" />
          </div>
          <span className="nav-label">{t("dashboard.home")}</span>
        </button>

        <button
          className={`nav-btn_dashboard ${tab === "discount" ? "active" : ""}`}
          onClick={() => handleNavClick("discount")}
          title={t("dashboard.discount")}
        >
          <div className="nav-icon">
            <img src={discountIcon} alt="Discount" />
          </div>
          <span className="nav-label">{t("dashboard.discount")}</span>
        </button>

        <button
          className={`nav-btn_dashboard ${tab === "profile" ? "active" : ""}`}
          onClick={() => handleNavClick("profile")}
          title={t("dashboard.profile")}
        >
          <div className="nav-icon">
            <img src={profileIcon} alt="Profile" />
          </div>
          <span className="nav-label">{t("dashboard.profile")}</span>
        </button>
      </div>

      {/* COMING SOON TOAST */}
      {showComingSoonToast && (
        <div className="coming-soon-toast">
          🎁 {t("dashboard.comingSoon") || "Tez orada qo'shiladi"}
        </div>
      )}

      {/* NAV LOADING OVERLAY */}
      {navLoading && (
        <div className="nav-loading-overlay">
          <StarOutlineLoader size={64} />
        </div>
      )}

      {/* DYNAMIC CONTENT - Only show when not home tab */}
      {tab === "history" && (
        <div className="overlay-modal_dashboard">
          <iframe
            src="/history"
            className="iframe-modal_dashboard"
            title="History"
          ></iframe>
        </div>
      )}



      {tab === "profile" && (
        <div className="overlay-modal_dashboard">
          <iframe
            src="/profile"
            className="iframe-modal_dashboard"
            title="Profile"
          ></iframe>
        </div>
      )}

      {tab === "discount" && (
        <div className="overlay-modal_dashboard">
          <iframe
            src="/discount"
            className="iframe-modal_dashboard"
            title="Discount"
          ></iframe>
        </div>
      )}

      {/* Language Selection Modal */}
      {showLanguageModal && (
        <div className="language-modal-overlay" onClick={() => setShowLanguageModal(false)}>
          <div className="language-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-sticker-wrap">
              <TGSSticker stickerPath={tilSticker} className="modal-top-sticker" />
            </div>

            <p className="modal-subtitle">{t("common.selectLanguage") || "Tilni tanlang"}</p>

            <div className="language-options">
              <label className={`language-option ${selectedLanguage === 'uz' ? 'selected' : ''}`}>
                <input type="radio" name="language" value="uz" checked={selectedLanguage === 'uz'} onChange={(e) => setSelectedLanguage(e.target.value)} />
                <span className="language-name">O'zbekcha</span>
              </label>
              <label className={`language-option ${selectedLanguage === 'en' ? 'selected' : ''}`}>
                <input type="radio" name="language" value="en" checked={selectedLanguage === 'en'} onChange={(e) => setSelectedLanguage(e.target.value)} />
                <span className="language-name">English</span>
              </label>
              <label className={`language-option ${selectedLanguage === 'ru' ? 'selected' : ''}`}>
                <input type="radio" name="language" value="ru" checked={selectedLanguage === 'ru'} onChange={(e) => setSelectedLanguage(e.target.value)} />
                <span className="language-name">Русский</span>
              </label>
            </div>

            <button className="modal-confirm-btn" onClick={handleLanguageConfirm}>
              {t("common.confirm") || "Tasdiqlash"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
