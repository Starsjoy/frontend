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
import langIcon from "../../assets/lang.png";
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

      const tgPhoto =
        WebApp?.initDataUnsafe?.user?.photo_url ||
        window?.Telegram?.WebApp?.initDataUnsafe?.user?.photo_url;

      if (tgUser) {
        const clean = tgUser.replace("@", "");
        setUsername(clean);
        localStorage.setItem("username", clean);
        setIsTelegram(true);
        if (tgPhoto) setUserPhoto(tgPhoto);
        
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

        const res = await apiFetch(`/api/user/history/${username}`);
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

  /* ================= CHANNEL BANNER ================= */
  useEffect(() => {
    if (splashVisible) return;
    const timer = setTimeout(() => {
      setShowChannelBanner(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [splashVisible]);

  /* ================= UI ================= */

  // Splash screen - Starsjoy Premium Brand
  if (splashVisible) {
    return (
      <div className={`splash-screen ${splashFading ? 'fade-out' : ''}`}>
        {/* Gradient mesh background */}
        <div className="splash-mesh"></div>
        
        {/* Subtle grid pattern */}
        <div className="splash-grid"></div>

        <div className="splash-content">
          {/* Minimal star logo */}
          <div className="splash-logo-container">
            <div className="splash-logo-ring"></div>
            <div className="splash-logo-ring ring-2"></div>
            <div className="splash-logo-star">
              <svg viewBox="0 0 24 24" fill="none">
                <path 
                  d="M12 2L14.09 8.26L21 9.27L16 14.14L17.18 21.02L12 17.77L6.82 21.02L8 14.14L3 9.27L9.91 8.26L12 2Z" 
                  fill="url(#logoGradient)"
                  stroke="rgba(59,130,246,0.5)"
                  strokeWidth="0.5"
                />
                <defs>
                  <linearGradient id="logoGradient" x1="12" y1="2" x2="12" y2="21">
                    <stop offset="0%" stopColor="#60a5fa"/>
                    <stop offset="100%" stopColor="#3b82f6"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Brand Typography */}
          <div className="splash-typography">
            <h1 className="splash-main-title">STARSJOY</h1>
            <div className="splash-divider"></div>
            <p className="splash-subtitle">Telegram Stars</p>
          </div>

          {/* Minimal loader */}
          <div className="splash-minimal-loader">
            <div className="loader-line"></div>
          </div>
        </div>

        {/* Bottom branding */}
        <div className="splash-footer">
          <span>Powered by Telegram</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-root_dashboard">

      {/* HEADER */}
      <header className="dash-header_dashboard">
        <div className="header-inner_dashboard">
          <div className="header-avatar_dashboard" onClick={() => handleNavClick("profile")}>
            {userPhoto ? (
              <img src={userPhoto} alt="avatar" className="header-avatar-img" />
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            )}
          </div>
          <h1 className="brand-title_dashboard">
            Starsjoy
          </h1>
          <button
            className="language-btn-dashboard"
            onClick={() => {
              setSelectedLanguage(language);
              setShowLanguageModal(true);
            }}
            title={t("profile.language")}
          >
            <img src={langIcon} alt="lang" className="lang-btn-img" />
          </button>
        </div>
      </header>

      {/* ACTION BUTTONS - Stars & Premium on top, Gift below */}
      <div className="top-actions_dashboard">
        <div
          className="action-card_dashboard"
          onClick={() => navigate("/stars")}
        >
          <img src={starsGif} className="plan-gif_dashboard" />
          <span>{t("dashboard.buyStars") || "Stars olish"}</span>
        </div>
        <div
          className="action-card_dashboard"
          onClick={() => navigate("/premium")}
        >
          <img src={premiumGif} className="plan-gif_dashboard" />
          <span>{t("dashboard.buyPremium") || "Premium olish"}</span>
        </div>
      </div>

      {/* GIFT BLOCK - Full width */}
      <div className="gift-action-block" onClick={() => navigate("/gift")}>
        <div className="gift-action-block__content">
          <div className="gift-action-block__text">
            <span className="gift-action-block__title">Gift olish</span>
            <span className="gift-action-block__subtitle">Noyob giftlarni oling</span>
          </div>
        </div>
        <img src={ayiqImg} className="gift-action-block__img" alt="gift" />
      </div>

      <main className="dash-main_dashboard" style={{display: tab === 'home' ? 'block' : 'none'}}>

        {/* ================= REFERRAL AD ================= */}
        <div className="mission-ad-card_dashboard referral-theme" onClick={() => handleNavClick("referral")} style={{
            position: 'relative', 
            overflow: 'hidden', 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px'
        }}>
          
          {/* LEFT: INFO */}
          <div style={{flex: 1, paddingRight: '10px', zIndex: 2}}>
             <div style={{
               fontSize: '12px', 
               fontWeight: '500', 
               color: '#fff', 
               marginBottom: '8px', 
               lineHeight: '1.3'
             }}>
                 {t("dashboard.referralTitleNew") || "Do'stlaringizni taklif qiling va stars bonus oling!"}
             </div>

             <div style={{display: 'flex', gap: '6px', alignItems: 'center'}}>
                {/* Bonus Badge 1 */}
                <div style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  background: 'rgba(255, 255, 255, 0.25)', 
                  padding: '4px 8px', 
                  borderRadius: '8px',
                  backdropFilter: 'blur(4px)'
                }}>
                   <img src={starsGif} alt="stars" style={{width: '14px', height: '14px', objectFit: 'contain'}} />
                   <span style={{fontSize: '10px', fontWeight: '600', color: '#fff'}}>+5</span>
                </div>

                {/* Bonus Badge 2 */}
                <div style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  background: 'rgba(255, 255, 255, 0.25)', 
                  padding: '4px 8px', 
                  borderRadius: '8px',
                  backdropFilter: 'blur(4px)'
                }}>
                   <img src={premiumGif} alt="prem" style={{width: '14px', height: '14px', objectFit: 'contain'}} />
                   <span style={{fontSize: '10px', fontWeight: '600', color: '#fff'}}>+25</span>
                </div>

                {/* CTA Button */}
                <div className="referral-cta-btn">
                  🔗 Havolani olish
                </div>
             </div>
          </div>

          {/* RIGHT: STICKER */}
          <div style={{
            width: '60px',
            height: '60px',
            zIndex: 2,
            flexShrink: 0
          }}>
             <TGSSticker stickerPath={referalSticker} className="mission-ad-sticker" />
          </div>

        </div>

        {/* ================= GLOBAL / LEADERBOARD ================= */}
        <section className="leaderboard-card_dashboard">
          <div className="leaderboard-header_dashboard">
             <h3>🏆 {t("dashboard.stat") || "Statistika"}</h3>
             <div className="stats-toggles">
                 <button 
                     className={`stats-toggle-btn ${statsTab === 'sales' ? 'active' : ''}`}
                     onClick={() => setStatsTab('sales')}
                 >
                     {t("dashboard.sales") || "Savdo"}
                 </button>
                 <button 
                      className={`stats-toggle-btn ${statsTab === 'referral' ? 'active' : ''}`}
                      onClick={() => setStatsTab('referral')}
                 >
                      {t("dashboard.referralT") || "Referal"}
                 </button>
             </div>
          </div>

          {statsTab === 'sales' && loading && (
            <div className="skeleton-list">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="skeleton-row"></div>
              ))}
            </div>
          )}
          
          {statsTab === 'sales' && error && <p className="error_dashboard">{error}</p>}
          
          {/* === SALES LIST === */}
          {statsTab === 'sales' && !loading && !error && leaderboard.length === 0 && (
            <div className="empty-state_dashboard">
              {t("dashboard.noOrders") || "Hozircha ma'lumot yo'q"}
            </div>
          )}

          {statsTab === 'sales' && !loading && leaderboard.map((u, i) => (
            <div key={u.username} className={`rank-row_dashboard rank-${i + 1}`}>
              <span className="rank_dashboard">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${u.rank}`}
              </span>
              <span className="user_dashboard">@{u.username}</span>
              <span className="sum_dashboard">
                {formatAmount(u.total)} so‘m
              </span>
            </div>
          ))}

          {/* === REFERRAL LIST (Top 10) === */}
          {statsTab === 'referral' && referralBoard.length === 0 && (
             <div className="empty-state_dashboard">
                {t("dashboard.noReferrals") || "Hozircha referallar yo'q"}
             </div>
          )}
          
          {statsTab === 'referral' && referralBoard.slice(0, 10).map((u, i) => (
            <div key={u.username} className={`rank-row_dashboard rank-${i + 1}`}>
              <span className="rank_dashboard">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
              </span>
              <span className="user_dashboard">@{u.username}</span>
              <span className="sum_dashboard">
                {u.referrals} do'st
              </span>
            </div>
          ))}
          
          {isTelegram && !loading && (
            <>
              <hr />
              {/* ME - SALES */}
              {statsTab === 'sales' && (
                  myRank ? (
                    myRank.rank > 10 && (
                      <div className="rank-row_dashboard me">
                        <span className="rank_dashboard">#{myRank.rank}</span>
                        <span className="user_dashboard">
                          @{myRank.username} (siz)
                        </span>
                        <span className="sum_dashboard">
                          {formatAmount(myRank.total)} so‘m
                        </span>
                      </div>
                    )
                  ) : (
                    <div className="empty-state_dashboard" style={{marginTop: 0, border: 'none', background: 'transparent', padding: '8px'}}>
                      {t("dashboard.noPurchasesYet") || "Siz hali xarid qilmagansiz"}
                    </div>
                  )
              )}
              
              {/* ME - REFERRAL */}
              {statsTab === 'referral' && (
                  myRefRank ? (
                    myRefRank.rank > 10 ? (
                      <div className="rank-row_dashboard me">
                        <span className="rank_dashboard">#{myRefRank.rank}</span>
                        <span className="user_dashboard">
                          @{myRefRank.username} (siz)
                        </span>
                        <span className="sum_dashboard">
                          {myRefRank.referrals} do'st
                        </span>
                      </div>
                    ) : (
                      <div className="rank-row_dashboard me">
                        <span className="rank_dashboard">#{myRefRank.rank}</span>
                        <span className="user_dashboard">
                          @{myRefRank.username} (siz)
                        </span>
                        <span className="sum_dashboard">
                          {myRefRank.referrals} do'st
                        </span>
                      </div>
                    )
                  ) : (
                     <div className="empty-state_dashboard" style={{marginTop: 0, border: 'none', background: 'transparent', padding: '8px'}}>
                       Siz hali do'st taklif qilmagansiz
                     </div>
                  )
              )}
            </>
          )}
        </section>



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
          onClick={() => handleNavClick("history")}
          title={t("dashboard.myHistory")}
        >
          <div className="nav-icon">
            <img src={statsIcon} alt="Stats" />
          </div>
        </button>

        <button
          className={`nav-btn_dashboard ${tab === "referral" ? "active" : ""}`}
          onClick={() => handleNavClick("referral")}
          title={t("dashboard.referral")}
        >
          <div className="nav-icon">
            <img src={discountIcon} alt="Referral" />
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

      {tab === "referral" && (
        <div className="overlay-modal_dashboard">
          <iframe
            src="/referral"
            className="iframe-modal_dashboard"
            title="Referral"
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

      {/* Channel Subscribe Bottom Sheet - Glass Style */}
      {showChannelBanner && (
        <div className="subscribe-sheet-overlay" onClick={() => setShowChannelBanner(false)}>
          <div className="subscribe-sheet glass" onClick={(e) => e.stopPropagation()}>
            <div className="subscribe-sheet-handle"></div>
            <button className="subscribe-sheet-close" onClick={() => setShowChannelBanner(false)}>✕</button>
            <div className="subscribe-sheet-content">
              <div className="subscribe-channel-info">
                <img 
                  src={starsjoyAvatar} 
                  alt="Starsjoy" 
                  className="subscribe-channel-avatar"
                />
                <div className="subscribe-channel-details">
                  <h3 className="subscribe-channel-name">Starsjoy</h3>
                  <span className="subscribe-channel-link">@starsjoy</span>
                </div>
              </div>
              <p className="subscribe-sheet-text">
                {t("dashboard.subscribeChannel") || "Yangiliklar va maxsus takliflardan xabardor bo'ling!"}
              </p>
              <button className="subscribe-sheet-btn pulse-glow" onClick={() => {
                setShowChannelBanner(false);
                try {
                  WebApp.openTelegramLink("https://t.me/starsjoy");
                } catch {
                  window.open("https://t.me/starsjoy", "_blank");
                }
              }}>
                <span className="subscribe-btn-icon">📢</span>
                {t("dashboard.subscribe") || "Kanalga qo'shilish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
