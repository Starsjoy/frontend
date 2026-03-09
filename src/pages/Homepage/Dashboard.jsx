import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import WebApp from "@twa-dev/sdk";
import { useTranslation } from "../../context/LanguageContext";
import apiFetch from "../../utils/apiFetch";
import { TGSSticker } from "../../components/TGSSticker";
import "./Dashboard.css";

import starsGif from "../../assets/stars.gif";
import premiumGif from "../../assets/premium_gif.gif";
import ayiqImg from "../../assets/ayiqyurakchali.jpg";
import tilSticker from "../../assets/AnimatedSticker_til.tgs";
import loadingSticker from "../../assets/Animated_loading.tgs";
import referalSticker from "../../assets/AnimatedSticker_ref.tgs";
import ordersIcon from "../../assets/orders_icon.png";
import profileIcon from "../../assets/profile_icon.png";
import menuIcon from "../../assets/main_icon.png";
import bellsIcon from "../../assets/bells_icon.png";
import starsjoyAvatar from "../../assets/starsjoy.jpg";
import statsIcon from "../../assets/stats_icon.png";
import discountIcon from "../../assets/discount_icon.png";


// ================== UTILS ==================
const formatAmount = (num) =>
  Number(num || 0).toLocaleString("ru-RU");

// ================== COMPONENT ==================
export default function Dashboard() {
  const navigate = useNavigate();
  const { t, language, setLanguage } = useTranslation();

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
  const [tab, setTab] = useState("home"); // home | referral | profile | history | challenges
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

  /* ================= NOTIFICATIONS ================= */
  const [unreadCount, setUnreadCount] = useState(0);

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
        }),
      });
    } catch (err) {
      console.error("Auto-register error:", err);
    }
  };

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

  /* ================= LOAD LEADERBOARD (GLOBAL) ================= */
  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await apiFetch(
          `/api/stats/leaderboard${username ? `?username=${username}` : ""}`
        );
        const json = await res.json();

        setLeaderboard(json.top10 || []);
        setMyRank(json.me || null);

      } catch {
        setError("Statistikani yuklashda xatolik");
      } finally {
        setLoading(false);
      }
    };

    loadLeaderboard();
  }, [username]);

  /* ================= LOAD REFERRAL LEADERBOARD ================= */
  useEffect(() => {
    const loadReferralBoard = async () => {
      // Har doim yuklayveramiz, username bo'lmasa umumiy ro'yxatni
      try {
        const res = await apiFetch(
          `/api/referral/leaderboard${username ? `?username=${username}` : ""}`
        );
        const json = await res.json();
        setReferralBoard(json.top10 || []);
        setMyRefRank(json.me || null);
      } catch (e) {
        console.error("Ref stats error:", e);
      }
    };
    loadReferralBoard();
  }, [username]);

  /* ================= LOAD USER CHALLENGE ================= */
  useEffect(() => {
    if (!isTelegram || !username) return;

    const loadHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        const uid = localStorage.getItem("userId");
        if (!uid) return;
        const res = await apiFetch(`/api/user/history/${uid}`);
        const json = await res.json();

        const orders = json || [];
        setHistory(orders);

        // 🔥 CHALLENGE FAQAT USER TARIXIDAN
        const total = orders
          .filter(o =>
            ["stars_sent", "premium_sent"].includes(o.status)
          )
          .reduce((s, o) => s + Number(o.amount || 0), 0);

        setMyTotal(total);

        // 🔥 REFERRAL BALANCE
        const refRes = await apiFetch(`/api/referral/stats/${username}`);
        if(refRes.ok) {
           const refJson = await refRes.json();
           setReferralBalance(refJson.referral_balance || 0);
           setReferralCount(refJson.total_referrals || 0);
        }

      } catch {
        setError("Tarixni yuklashda xatolik");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [isTelegram, username]);

  /* ================= LOAD UNREAD NOTIFICATIONS ================= */
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

  /* ================= SPLASH AUTO-HIDE ================= */
  useEffect(() => {
    if (!splashVisible) return;
    const fadeTimer = setTimeout(() => setSplashFading(true), 2500);
    const hideTimer = setTimeout(() => {
      setSplashVisible(false);
      sessionStorage.setItem("splashShown", "1");
    }, 3000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  /* ================= UI ================= */

  // Splash screen - StarsJoy Loader
  if (splashVisible) {
    return (
      <div className={`splash-screen ${splashFading ? 'fade-out' : ''}`}>
        {/* Aura background */}
        <div className="splash-aura"></div>

        <div className="splash-loader">
          {/* Icon with oval rings */}
          <div className="splash-icon-wrap">
            <div className="splash-oval splash-oval-1"></div>
            <div className="splash-oval splash-oval-2"></div>
            <div className="splash-oval splash-oval-3"></div>
            <svg className="splash-star" viewBox="0 0 48 48" width="40" height="40">
              <defs>
                <linearGradient id="splashGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ddd6fe"/>
                  <stop offset="50%" stopColor="#8b5cf6"/>
                  <stop offset="100%" stopColor="#6d28d9"/>
                </linearGradient>
              </defs>
              <path 
                d="M24 4C24 4 26.5 14 30 18C34 22 44 24 44 24C44 24 34 26 30 30C26.5 34 24 44 24 44C24 44 21.5 34 18 30C14 26 4 24 4 24C4 24 14 22 18 18C21.5 14 24 4 24 4Z" 
                fill="url(#splashGradient)"
              />
            </svg>
          </div>

          {/* Brand name */}
          <div className="splash-brand">Stars<em>Joy</em></div>

          {/* Loading dots */}
          <div className="splash-dots">
            <div className="splash-dot"></div>
            <div className="splash-dot"></div>
            <div className="splash-dot"></div>
            <div className="splash-dot"></div>
            <div className="splash-dot"></div>
          </div>
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
            <img src={starsjoyAvatar} alt="Starsjoy" className="brand-logo_dashboard" />
            Starsjoy
          </h1>
          <button
            className="notification-btn-dashboard"
            onClick={() => navigate("/notifications")}
            title="Notifications"
          >
            <img src={bellsIcon} alt="notifications" className="notification-btn-img" />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
        </div>
      </header>

      <main className="dash-main_dashboard" style={{display: tab === 'home' ? 'flex' : 'none'}}>
        {/* ACTION CARDS - Stars wide, Gift & Premium side by side */}
        <div className="dashboard-actions-container">
          {/* Stars - Full Width */}
          <div className="action-card-wide" onClick={() => navigate("/stars")}>
            <img src={starsGif} className="action-card-wide__img" alt="stars" />
            <div className="action-card-wide__content">
              <span className="action-card-wide__title">{t("dashboard.buyStars") || "Stars olish"}</span>
              <span className="action-card-wide__subtitle">{t("dashboard.starsDesc") || "Telegram stars xarid qiling"}</span>
            </div>
          </div>

          {/* Referral Invite Banner */}
          <div 
            className="referral-invite-banner"
            onClick={() => navigate("/referral")}
          >
            <div className="referral-banner-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div className="referral-banner-content">
              <div className="referral-banner-text">
                {t("dashboard.referralBanner") || "Do'stlaringizni taklif qiling va bonus oling"}
              </div>
              <div className="referral-banner-rewards">
                <div className="referral-reward-badge">
                  ⭐ +2
                </div>
                <div className="referral-reward-badge">
                  ⭐ +15
                </div>
              </div>
            </div>
            <button 
              className="referral-banner-button"
              onClick={(e) => {
                e.stopPropagation();
                navigate("/referral");
              }}
            >
              {t("dashboard.getLink") || "Havola olish"}
            </button>
          </div>

          {/* Gift & Premium - Side by Side */}
          <div className="action-cards-row">
            <div className="action-card-half" onClick={() => navigate("/gift")}>
              <img src={ayiqImg} className="action-card-half__img" alt="gift" />
              <span className="action-card-half__title">{t("dashboard.buyGift") || "Gift olish"}</span>
            </div>
            <div className="action-card-half" onClick={() => navigate("/premium")}>
              <img src={premiumGif} className="action-card-half__img" alt="premium" />
              <span className="action-card-half__title">{t("dashboard.buyPremium") || "Premium olish"}</span>
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
        </button>

        <button
          className={`nav-btn_dashboard ${tab === "history" ? "active" : ""}`}
          onClick={() => navigate("/statistics")}
          title={t("dashboard.statistics") || "Statistika"}
        >
          <div className="nav-icon">
            <img src={statsIcon} alt="Stats" />
          </div>
        </button>

        <button
          className={`nav-btn_dashboard ${tab === "referral" ? "active" : ""}`}
          onClick={() => navigate("/discount")}
          title="Chegirma"
        >
          <div className="nav-icon">
            <img src={discountIcon} alt="Discount" />
          </div>
        </button>

        <button
          className={`nav-btn_dashboard ${tab === "profile" ? "active" : ""}`}
          onClick={() => handleNavClick("profile")}
          title={t("dashboard.profile")}
        >
          <div className="nav-icon">
            <img src={profileIcon} alt="Profile" />
          </div>
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
          <div className="nav-loading-sticker">
             <TGSSticker stickerPath={loadingSticker} />
          </div>
          <p className="nav-loading-text">{t("common.loading") || "Yuklanmoqda..."}</p>
        </div>
      )}

      {/* DYNAMIC CONTENT - Only show when not home tab */}
      {tab === "challenges" && (
        <div className="overlay-modal_dashboard">
          <iframe
            src="/challenges"
            className="iframe-modal_dashboard"
            title="Challenges"
          ></iframe>
        </div>
      )}

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
