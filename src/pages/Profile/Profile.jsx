import React, { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { useNavigate } from "react-router-dom";
import "./Profile.css";
import { useTranslation } from "../../context/LanguageContext";
import apiFetch from "../../utils/apiFetch";
import { TGSSticker } from "../../components/TGSSticker";
import tilSticker from "../../assets/AnimatedSticker_til.tgs";

export default function Profile() {
  const { t, language, setLanguage } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState({
    username: "User",
    photo_url: null,
    balance: 0,
    friends: 0
  });
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(language);

  const langLabels = { uz: "O'zbekcha", en: "English", ru: "Русский" };

  useEffect(() => {
    let username = "User";
    let photoUrl = null;

    try {
      if (WebApp.initDataUnsafe?.user) {
        username = WebApp.initDataUnsafe.user.username || WebApp.initDataUnsafe.user.first_name;
        photoUrl = WebApp.initDataUnsafe.user.photo_url;
      }
    } catch (e) {
      console.error("Telegram WebApp not ready");
    }

    const storedUser = localStorage.getItem("username");
    if (storedUser && (!WebApp.initDataUnsafe?.user?.username)) {
      username = storedUser;
    }

    const fetchStats = async () => {
      try {
        const safeUsername = username.replace("@", "");
        const res = await apiFetch(`/api/referral/stats/${safeUsername}`);
        if (res.ok) {
          const data = await res.json();
          setUser(prev => ({
            ...prev,
            username,
            photo_url: photoUrl,
            balance: data.referral_balance || 0,
            friends: data.total_referrals || 0
          }));
        } else {
          setUser(prev => ({ ...prev, username, photo_url: photoUrl }));
        }
      } catch (err) {
        console.error("Failed to fetch profile stats", err);
        setUser(prev => ({ ...prev, username, photo_url: photoUrl }));
      }
    };

    fetchStats();
  }, []);

  const handleLanguageConfirm = () => {
    setLanguage(selectedLanguage);
    setShowLanguageModal(false);
  };

  return (
    <div className="settings-page">
      {/* Profile Header */}
      <div className="settings-profile-header">
        <div className="settings-avatar-wrap">
          {user.photo_url ? (
            <img src={user.photo_url} alt="Profile" className="settings-avatar-img" />
          ) : (
            <div className="settings-avatar-placeholder">
              {user.username ? user.username.charAt(0).toUpperCase() : "U"}
            </div>
          )}
        </div>
        <h2 className="settings-username">{user.username}</h2>
        <p className="settings-handle">@{user.username.replace("@", "")}</p>
      </div>

      {/* Settings Items */}
      <div className="settings-group">
        {/* 1. Til almashtirish */}
        <div className="settings-item" onClick={() => setShowLanguageModal(true)}>
          <div className="settings-item-left">
            <div className="settings-icon icon-lang">🌐</div>
            <div className="settings-item-text">
              <span className="settings-item-title">{t("profile.language") || "Til"}</span>
              <span className="settings-item-desc">{t("common.selectLanguage") || "Tilni tanlang"}</span>
            </div>
          </div>
          <div className="settings-item-right">
            <span className="settings-item-value">{langLabels[language]}</span>
            <span className="settings-arrow">›</span>
          </div>
        </div>

        {/* 2. Mening buyurtmalarim */}
        <div className="settings-item" onClick={() => navigate("/history")}>
          <div className="settings-item-left">
            <div className="settings-icon icon-orders">📦</div>
            <div className="settings-item-text">
              <span className="settings-item-title">{t("profile.myOrders") || "Mening buyurtmalarim"}</span>
              <span className="settings-item-desc">{t("profile.myOrdersDesc") || "Xaridlar tarixi"}</span>
            </div>
          </div>
          <div className="settings-item-right">
            <span className="settings-arrow">›</span>
          </div>
        </div>

        {/* 3. Referral Balans */}
        <div className="settings-item" onClick={() => navigate("/referral")}>
          <div className="settings-item-left">
            <div className="settings-icon icon-balance">💰</div>
            <div className="settings-item-text">
              <span className="settings-item-title">{t("referral.balance") || "Referral Balans"}</span>
              <span className="settings-item-desc">{t("referral.rewardStars") || "Yulduzlar"}</span>
            </div>
          </div>
          <div className="settings-item-right">
            <span className="settings-item-value">{user.balance} ⭐</span>
            <span className="settings-arrow">›</span>
          </div>
        </div>

        {/* 4. Do'stlar soni */}
        <div className="settings-item" onClick={() => navigate("/referral")}>
          <div className="settings-item-left">
            <div className="settings-icon icon-friends">👥</div>
            <div className="settings-item-text">
              <span className="settings-item-title">{t("profile.friendsCount") || "Do'stlar soni"}</span>
              <span className="settings-item-desc">{t("profile.friendsCountDesc") || "Referral dasturi"}</span>
            </div>
          </div>
          <div className="settings-item-right">
            <span className="settings-item-value">{user.friends}</span>
            <span className="settings-arrow">›</span>
          </div>
        </div>
      </div>

      {/* Support & Channel */}
      <div className="settings-group">
        {/* 5. Yordam */}
        <div className="settings-item" onClick={() => {
          try { WebApp.openTelegramLink("https://t.me/starsjoy_bot"); } catch { window.open("https://t.me/starsjoy_bot", "_blank"); }
        }}>
          <div className="settings-item-left">
            <div className="settings-icon icon-support">🛟</div>
            <div className="settings-item-text">
              <span className="settings-item-title">{t("profile.support") || "Yordam"}</span>
              <span className="settings-item-desc">{t("profile.supportDesc") || "Savollar va muammolar"}</span>
            </div>
          </div>
          <div className="settings-item-right">
            <span className="settings-item-value">@starsjoy_bot</span>
            <span className="settings-arrow">›</span>
          </div>
        </div>

        {/* 6. Yangiliklar kanali */}
        <div className="settings-item" onClick={() => {
          try { WebApp.openTelegramLink("https://t.me/starsjoy"); } catch { window.open("https://t.me/starsjoy", "_blank"); }
        }}>
          <div className="settings-item-left">
            <div className="settings-icon icon-channel">📢</div>
            <div className="settings-item-text">
              <span className="settings-item-title">{t("profile.channel") || "Yangiliklar kanali"}</span>
              <span className="settings-item-desc">{t("profile.channelDesc") || "Yangiliklar va updates"}</span>
            </div>
          </div>
          <div className="settings-item-right">
            <span className="settings-item-value">@starsjoy</span>
            <span className="settings-arrow">›</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="settings-footer">
        <p className="footer-copyright">© 2026 Starsjoy</p>
        <p className="footer-rights">Barcha huquqlar himoyalangan</p>
        <div className="footer-divider"></div>
        <p className="footer-version">v3.1.1</p>
      </div>

      {/* Language Modal */}
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
