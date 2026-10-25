import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import WebApp from "@twa-dev/sdk";
import { useTranslation } from "../../context/LanguageContext";
import { useOnboarding } from "../../context/OnboardingContext";
import apiFetch from "../../utils/apiFetch";
import { APP_BG, applyTelegramChrome } from "../../utils/telegramChrome";
import {
  getStarsPurchasePath,
  getPremiumPurchasePath,
} from "../../utils/starsPurchaseRoute";
import { BookOpen, Headset } from "lucide-react";
import { TGSSticker } from "../../components/TGSSticker";
import StarsJoyLogoStatic from "../../components/Loaders/StarsJoyLogoStatic";
import LogoWordmark from "../../components/Loaders/LogoWordmark";
import StarOutlineLoader from "../../components/Loaders/StarOutlineLoader";
import { broadcastSafeAreaTo, listenForIframeReadyPings } from "../../utils/tgSafeAreaBridge";
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
import bonusIcon from "../../assets/bonus_icon.svg";


// ================== UTILS ==================
const formatAmount = (num) =>
  Number(num || 0).toLocaleString("ru-RU");

// ================== COMPONENT ==================
export default function Dashboard() {
  const navigate = useNavigate();
  const { t, language, setLanguage, onboardingCompleted, markOnboardingComplete, prefsReady } = useTranslation();
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
  // Dashboard init birinchi marta tugadimi — qo'llanma CTA'si tarix kelmasdan chiqib-yo'qolmasin
  const [dashboardReady, setDashboardReady] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  // Pastki menyudagi "Bonuslar" belgisi: hali "Olish" bosilmagan bonuslar soni
  const [bonusUnseen, setBonusUnseen] = useState(0);
  // Iframe bo'lim (Profil, Chegirma, Tarix) yuklanib bo'lganmi — tayyor bo'lguncha
  // iframe ko'rinmaydi (oq chaqnash bo'lmasin)
  const [iframeReady, setIframeReady] = useState(false);
  const navLoaderTimers = useRef({ show: null, max: null });
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

  // Ichki tab'lar (Profil, Chegirma, Tarix) <iframe>da yuklanadi — ular
  // Telegram'ning safe-area qiymatlarini o'zi ololmaydi, shu sabab
  // "tayyorman" signali kelganda darhol shu oynadagi haqiqiy qiymatni
  // yuboramiz (onLoad orqali ham yuboriladi — timing race'ga qarshi
  // ikkalasi ham ishlatiladi).
  useEffect(() => listenForIframeReadyPings(), []);

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

      // Telegram fon/sarlavha/pastki panel — bitta rang (overscroll'da oq ko'rinmasin)
      applyTelegramChrome();
      document.body.style.backgroundColor = APP_BG;

      // Telegram expand qilish
      WebApp.expand();

      // Fullscreen'ga o'tish (Bot API 8.0+) — eski klientlarda metod
      // umuman mavjud bo'lmasligi yoki mos kelmagan versiyada xato
      // (WebAppMethodUnsupported) tashlashi mumkin, shu sabab ham
      // mavjudligini, ham versiyasini tekshirib, try/catch bilan o'raymiz.
      if (typeof WebApp.requestFullscreen === "function") {
        try {
          if (typeof WebApp.isVersionAtLeast !== "function" || WebApp.isVersionAtLeast("8.0")) {
            WebApp.requestFullscreen();
          }
        } catch {
          // Eski klient yoki qo'llab-quvvatlanmaydi — jim o'tkazib yuboramiz
        }
      }

      // Close (✕) tugmasi yoki pastga svayp bilan yopishga urinilganda
      // Telegram'ning o'zi "Yopishni xohlaysizmi?" tasdiqlash oynasini
      // ko'rsatadi — tasodifan chiqib ketishning oldini oladi.
      if (typeof WebApp.enableClosingConfirmation === "function") {
        try {
          WebApp.enableClosingConfirmation();
        } catch {
          // Eski klient — jim o'tkazib yuboramiz
        }
      }

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
        setDashboardReady(true);
      }
    };

    loadDashboard();
  }, [username]);

  /* ================= BONUSLAR BELGISI =================
     Ochilganda, har 30 soniyada va bo'lim almashganda yangilanadi. Bonuslar iframe'i
     "Olish" bosilganda postMessage yuboradi — belgi darhol kamayadi. */
  useEffect(() => {
    let alive = true;
    const load = () =>
      apiFetch("/api/rewards/unseen")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && d && setBonusUnseen(Number(d.count) || 0))
        .catch(() => {});
    load();
    const timer = setInterval(load, 30000);
    const onMessage = (e) => {
      if (e.origin !== window.location.origin || e.data?.channel !== "starsjoy-bonus") return;
      setBonusUnseen(Math.max(0, Number(e.data.unseen) || 0));
    };
    window.addEventListener("message", onMessage);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("message", onMessage);
    };
  }, [tab]);

  /* ================= KANAL OBUNASI (ixtiyoriy) =================
     Botda obuna majburiy emas. Sessiyada bir marta jimgina tekshiramiz — kanalga
     keyinroq qo'shilgan user missiya/referal hisobida sanalsin. Natija UI'ga ta'sir qilmaydi. */
  useEffect(() => {
    try {
      if (sessionStorage.getItem("subCheckDone")) return;
      sessionStorage.setItem("subCheckDone", "1");
    } catch {
      return;
    }
    apiFetch("/api/user/subscribe-check", { method: "POST" }).catch(() => {});
  }, []);

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

  // Loader faqat haqiqiy yuklanishda: iframe 300ms ichida yuklanmasa ko'rinadi,
  // yuklanishi bilan (onLoad) yo'qoladi. Asosiy'ga qaytishda loader yo'q.
  const NAV_LOADER_DELAY_MS = 300;
  const NAV_LOADER_MAX_MS = 10000; // onLoad kelmay qolsa ham loader osilib qolmasin

  const clearNavLoaderTimers = () => {
    clearTimeout(navLoaderTimers.current.show);
    clearTimeout(navLoaderTimers.current.max);
  };

  const finishNavLoading = () => {
    clearNavLoaderTimers();
    setNavLoading(false);
    setIframeReady(true);
  };

  useEffect(() => clearNavLoaderTimers, []);

  const handleNavClick = (targetTab) => {
    if (tab === targetTab) return;

    clearNavLoaderTimers();
    setNavLoading(false);
    setTab(targetTab);
    if (targetTab === "home") return;

    setIframeReady(false);
    navLoaderTimers.current.show = setTimeout(() => setNavLoading(true), NAV_LOADER_DELAY_MS);
    navLoaderTimers.current.max = setTimeout(finishNavLoading, NAV_LOADER_MAX_MS);
  };

  const handleIframeLoad = (e) => {
    broadcastSafeAreaTo(e.currentTarget);
    finishNavLoading();
  };

  const iframeStyle = { opacity: iframeReady ? 1 : 0, transition: "opacity 0.2s ease" };

  // Back Button Logic
  useEffect(() => {
    const handleBack = () => {
      // Modallar bo'lsa, ularni yopish afzal, lekin bu yerda tabni qaytarish ustuvor
      if (showLanguageModal) {
        setShowLanguageModal(false);
      } else if (tab !== "home") {
        handleNavClick("home");
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

  /* ================= QO'LLANMA CTA =================
     Tur avtomatik ochilmaydi — yangi foydalanuvchiga taklif kartochkasi ko'rsatiladi.
     Yo'qoladi: tur ko'rilganda yoki ✕ bosilganda (onboardingCompleted, bazada saqlanadi)
     yoki birinchi xariddan keyin. */
  const hasPurchased = history.some((o) =>
    ["stars_sent", "premium_sent", "gift_sent", "completed", "delivered"].includes(o.status)
  );
  // Server javoblari kelmaguncha ko'rsatilmaydi: prefs (boshqa qurilmada tur ko'rilgan bo'lishi
  // mumkin) va dashboard tarixi (xato bo'lsa tarix bo'sh — xaridorga ham chiqib qolmasin)
  const showGuideCta =
    prefsReady &&
    dashboardReady &&
    (!error || import.meta.env.DEV) && // lokal dev'da API 401 — dizaynni ko'rish uchun
    !onboardingCompleted &&
    !hasPurchased &&
    !tourActive;

  // Tur boshlanishi bilan "ko'rildi" deb belgilanadi — o'rtada ilova yopilsa ham CTA qaytmaydi
  const openGuideFromCta = () => {
    markOnboardingComplete();
    startTour();
  };


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
          </div>
        </div>
      </header>

      <main className="dash-main_dashboard" style={{display: tab === 'home' ? 'flex' : 'none'}}>
        {/* QO'LLANMA CTA — faqat yangi foydalanuvchiga */}
        {showGuideCta && (
          <div
            className="guide-cta_dashboard"
            role="button"
            tabIndex={0}
            onClick={openGuideFromCta}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openGuideFromCta()}
          >
            <span className="guide-cta_dashboard__wave" aria-hidden="true">👋</span>
            <span className="guide-cta_dashboard__text">
              <span className="guide-cta_dashboard__title">{t("onboarding.ctaTitle")}</span>
              <span className="guide-cta_dashboard__desc">{t("onboarding.ctaDesc")}</span>
            </span>
            <span className="guide-cta_dashboard__play">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true">
                <path d="M8 5.5v13l10.5-6.5z" />
              </svg>
              <span className="guide-cta_dashboard__play-label">{t("onboarding.ctaAction")}</span>
            </span>
            <button
              type="button"
              className="guide-cta_dashboard__close"
              aria-label={t("onboarding.ctaClose")}
              onClick={(e) => {
                e.stopPropagation();
                markOnboardingComplete();
              }}
            >
              ✕
            </button>
          </div>
        )}

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
          className={`nav-btn_dashboard ${tab === "bonus" ? "active" : ""}`}
          onClick={() => handleNavClick("bonus")}
          title={t("rewards.title")}
        >
          <div className="nav-icon">
            <img src={bonusIcon} alt="" />
            {bonusUnseen > 0 && (
              <span className="nav-badge_dashboard">{bonusUnseen > 99 ? "99+" : bonusUnseen}</span>
            )}
          </div>
          <span className="nav-label">{t("rewards.title")}</span>
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
          <StarOutlineLoader size={140} />
        </div>
      )}

      {/* DYNAMIC CONTENT - Only show when not home tab */}
      {tab === "history" && (
        <div className="overlay-modal_dashboard">
          <iframe
            src="/history"
            className="iframe-modal_dashboard"
            title="History"
            style={iframeStyle}
            onLoad={handleIframeLoad}
          ></iframe>
        </div>
      )}



      {tab === "profile" && (
        <div className="overlay-modal_dashboard">
          <iframe
            src="/profile"
            className="iframe-modal_dashboard"
            title="Profile"
            style={iframeStyle}
            onLoad={handleIframeLoad}
          ></iframe>
        </div>
      )}

      {tab === "bonus" && (
        <div className="overlay-modal_dashboard">
          <iframe
            src="/bonus"
            className="iframe-modal_dashboard"
            title="Bonus"
            style={iframeStyle}
            onLoad={handleIframeLoad}
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
