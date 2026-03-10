import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Referral.css";

import WebApp from "@twa-dev/sdk";
import { useTranslation } from "../../context/LanguageContext";
import { TGSSticker } from "../../components/TGSSticker";
import referralSticker from "../../assets/AnimatedSticker_referal.tgs";
import loadingSticker from "../../assets/Animated_loading.tgs";
import apiFetch from "../../utils/apiFetch";

// Gift IDlar - referral yechish uchun
const GIFTS = [
  { id: "5170145012310081615", stars: 15 },
  { id: "5170233102089322756", stars: 15 },
  { id: "5170250947678437525", stars: 25 },
  { id: "5168103777563050263", stars: 25 },
  { id: "5170144170496491616", stars: 50 },
  { id: "5170314324215857265", stars: 50 },
  { id: "5170564780938756245", stars: 50 },
  { id: "6028601630662853006", stars: 50 },
  { id: "5922558454332916696", stars: 50 },
  { id: "5801108895304779062", stars: 50 },
  { id: "5800655655995968830", stars: 50 },
  { id: "5866352046986232958", stars: 50 },
  { id: "5956217000635139069", stars: 50 },
  { id: "5168043875654172773", stars: 100 },
  { id: "5170690322832818290", stars: 100 },
  { id: "5170521118301225164", stars: 100 },
];

// Gift ID dan TGS sticker path olish
const getGiftStickerPath = (giftId) => {
  return new URL(`../../assets/${giftId}.tgs`, import.meta.url).href;
};

export default function Referral() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  // State
  const [username, setUsername] = useState(null);
  const [userId, setUserId] = useState(null);
  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  // Stats
  const [stats, setStats] = useState({
    referral_balance: 0,
    total_earnings: 0,
    total_referrals: 0,
    som_balance: 0,
  });
  const [earnings, setEarnings] = useState([]);
  const [claiming, setClaiming] = useState(false);

  // Withdrawal modal state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedGift, setSelectedGift] = useState(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [hoveredGift, setHoveredGift] = useState(null);

  // My friends state (referrer_username orqali)
  const [myFriends, setMyFriends] = useState([]);
  const [friendsCount, setFriendsCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  // Telegram Mini App Back Button
  useEffect(() => {
    try {
      WebApp.BackButton.show();
      const handleBackClick = () => navigate("/");
      WebApp.BackButton.onClick(handleBackClick);
      
      return () => {
        WebApp.BackButton.offClick(handleBackClick);
        WebApp.BackButton.hide();
      };
    } catch (err) {
      console.error("BackButton error:", err);
    }
  }, [navigate]);

  // Get Telegram user info
  useEffect(() => {
    const initTelegram = async () => {
      try {
        WebApp.ready();
        const tgUser = WebApp?.initDataUnsafe?.user;

        if (tgUser?.id) {
          const tgUserId = String(tgUser.id);
          setUserId(tgUserId);
          localStorage.setItem("userId", tgUserId);
          
          if (tgUser.username) {
            const clean = tgUser.username.replace("@", "");
            setUsername(clean);
            localStorage.setItem("username", clean);
          }
          
          registerUser(tgUserId);
        }
      } catch (err) {
        console.error("Telegram error:", err);
      }
    };
    initTelegram();
  }, []);

  // Register user with referral code
  const registerUser = async (user) => {
    try {
      // Check URL parameters for referral code
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get("ref");

      const res = await apiFetch("/api/referral/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user,
          referral_code: refCode || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setReferralCode(data.referral_code);
      }

      // Load referral link and stats
      loadReferralData(user);
    } catch (err) {
      console.error("Register error:", err);
    }
  };

  // Load referral link
  const loadReferralData = async (user) => {
    try {
      setLoading(true);

      // Parallel API calls
      const [linkRes, statsRes, earningsRes, friendsCountRes, myFriendsRes] = await Promise.all([
        apiFetch(`/api/referral/link/${user}`),
        apiFetch(`/api/referral/stats/${user}`),
        apiFetch(`/api/referral/earnings/${user}`),
        apiFetch(`/api/referral/friends-count/${user}`),
        apiFetch(`/api/referral/my-friends/${user}`)
      ]);

      // Process responses
      if (linkRes.ok) {
        const linkData = await linkRes.json();
        setReferralCode(linkData.referral_code);
        setReferralLink(linkData.referral_link);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (earningsRes.ok) {
        const earningsData = await earningsRes.json();
        setEarnings(earningsData.earnings || []);
      }

      // Friends count (referrer_username orqali)
      if (friendsCountRes.ok) {
        const fcData = await friendsCountRes.json();
        setFriendsCount(fcData.friends_count || 0);
      }

      // My friends list
      if (myFriendsRes.ok) {
        const mfData = await myFriendsRes.json();
        setMyFriends(mfData.friends || []);
        setPendingCount(mfData.pending_count || 0);
      }

      // Load withdrawal history
      const withdrawalsRes = await apiFetch(`/api/referral/withdrawals/${user}`);
      if (withdrawalsRes.ok) {
        const withdrawalsData = await withdrawalsRes.json();
        setWithdrawals(withdrawalsData || []);
      }
    } catch (err) {
      console.error("Load data error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Share function - Telegram Forward menu
  const shareLink = () => {
    if (!referralLink) return;

    try {
      // Text birinchi, keyin link - hammasi text ichida
      const fullMessage = `Bu bot orqali Telegram Starsni oson sotib olish mumkin:\n\n${referralLink}`;
      
      // URL parametriga bo'sh string, text parametriga to'liq xabar
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(" ")}&text=${encodeURIComponent(fullMessage)}`;
      
      // Open Telegram share dialog
      WebApp.openTelegramLink(shareUrl);
    } catch (err) {
      console.error("Share error:", err);
      // Fallback: copy to clipboard
      copyLink();
    }
  };

  // Withdraw referral balance as gift
  const handleWithdraw = async () => {
    if (!selectedGift || withdrawing) return;
    
    try {
      setWithdrawing(true);
      const res = await apiFetch("/api/referral/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giftId: selectedGift.id }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setWithdrawSuccess(true);
        // Update balance
        setStats(prev => ({
          ...prev,
          referral_balance: data.new_balance
        }));
        // Reset after 3 seconds
        setTimeout(() => {
          setShowWithdrawModal(false);
          setWithdrawSuccess(false);
          setSelectedGift(null);
        }, 3000);
      } else {
        alert(data.error || "Xatolik yuz berdi");
      }
    } catch (err) {
      console.error("Withdraw error:", err);
      alert("Server xatosi");
    } finally {
      setWithdrawing(false);
    }
  };

  // Open withdraw modal
  const openWithdrawModal = () => {
    setSelectedGift(null);
    setWithdrawSuccess(false);
    setShowWithdrawModal(true);
  };

  // Check if gift is affordable
  const canAfford = (gift) => stats.referral_balance >= gift.stars;

  return (
    <div className="referral-page">
      {/* Header */}
      <div className="referral-header centered-header">
        <div className="history-sticker-container">
           <TGSSticker stickerPath={referralSticker} className="history-sticker" />
        </div>
        <h1>{t("referral.title")}</h1>
        <p className="header-subtitle">{t("referral.headerDesc") || "Do'stlaringizni taklif qiling va sovg'alar oling"}</p>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="referral-loading-overlay">
          <div className="referral-loading-sticker">
            <TGSSticker stickerPath={loadingSticker} />
          </div>
          <p className="referral-loading-text">{t("common.loading") || "Yuklanmoqda..."}</p>
        </div>
      )}

      {!loading && (
        <>
          {/* Balance and Friends Stats */}
          <div className="ref-stats-group">
            <div className="ref-stats-item">
              <div className="ref-stats-left">
                <div className="ref-stats-icon">💲</div>
                <span>{t("referral.balance") || "Balans"}</span>
              </div>
              <div className="ref-stats-right">
                <span className="ref-stats-value">{stats.referral_balance} {t("referral.rewardStars") || "Stars"}</span>
              </div>
            </div>

            <div className="ref-stats-item">
              <div className="ref-stats-left">
                <div className="ref-stats-icon">👥</div>
                <span>{t("referral.friends") || "Do'stlar"}</span>
              </div>
              <div className="ref-stats-right">
                <span className="ref-stats-value">{friendsCount}</span>
                {pendingCount > 0 && (
                  <span className="ref-stats-pending" title="Kanalga obuna kutilmoqda">
                    (+{pendingCount} ⏳)
                  </span>
                )}
              </div>
            </div>

            {/* Withdraw Button */}
            <button className="ref-withdraw-btn" onClick={openWithdrawModal}>
              {t("referral.withdrawBalance")}
            </button>
          </div>

          {/* Bonus Info Section */}
          <div className="reward-section">
            <h2>{t("referral.howToEarn") || "Pul ishlash tartibi"}</h2>
            <div className="earn-steps-list">
              <div className="earn-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <span className="step-title">{t("referral.step1Title") || "Obuna bonus"}</span>
                  <span className="step-desc">{t("referral.step1Desc") || "Do'stingiz havolangiz orqali kirib, kanalga obuna bo'lsa"}</span>
                </div>
                <div className="step-bonus small">+2 ⭐</div>
              </div>
              <div className="earn-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <span className="step-title">{t("referral.step2Title") || "Stars bonus"}</span>
                  <span className="step-desc">{t("referral.step2Desc") || "Referalingiz har 50 stars olganida"}</span>
                </div>
                <div className="step-bonus small">+5 ⭐</div>
              </div>
              <div className="earn-step featured">
                <div className="step-number">3</div>
                <div className="step-content">
                  <span className="step-title">{t("referral.step3Title") || "Premium bonus"}</span>
                  <span className="step-desc">{t("referral.step3Desc") || "Referalingiz Premium obuna olsa"}</span>
                </div>
                <div className="step-bonus big">+15 ⭐</div>
              </div>
            </div>
          </div>

          {/* Referral Link Section */}
          <div className="referral-link-section">
            <h2>{t("referral.personalLink") || "Sizning havolangiz"}</h2>
            <p className="section-desc">{t("referral.linkDesc") || "Bu havolani do'stlaringizga yuboring"}</p>

            <div className="link-box">
              <div className="link-display">
                <span className="link-text">{referralLink || "..."}</span>
                <button className="copy-btn" onClick={copyLink}>
                  {copied ? "✓" : "📋"}
                </button>
              </div>
              <button className="share-btn" onClick={shareLink}>
                {t("referral.shareWithFriends") || "Ulashish"}
              </button>
            </div>

            <div className="referral-code-display">
              <p className="code-label">{t("referral.referralCode") || "Kod"}:</p>
              <code className="code-value">{referralCode || "..."}</code>
            </div>
          </div>

          {/* Mening Do'stlarim Section */}
          <div className="my-friends-section">
            <h2>{t("referral.myFriends") || "Mening do'stlarim"}</h2>
            {myFriends.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👥</div>
                <p className="empty-text">{t("referral.noFriends") || "Hali do'stlar yo'q"}</p>
                <p className="empty-hint">{t("referral.inviteFriends") || "Havolani ulashing va do'stlaringizni taklif qiling!"}</p>
              </div>
            ) : (
              <div className="friends-list">
                {myFriends.map((friend, idx) => (
                  <div key={idx} className={`friend-item ${!friend.subscribe_user ? 'inactive' : ''}`}>
                    <div className="friend-left">
                      <div className="friend-avatar">👤</div>
                      <div className="friend-info">
                        <p className="friend-name">@{friend.username || friend.user_id}</p>
                        <p className="friend-date">
                          {friend.subscribe_user ? (
                            new Date(friend.created_at).toLocaleDateString("uz-UZ", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })
                          ) : (
                            <span className="not-subscribed">{t("referral.notSubscribed") || "Kanalga obuna bo'lmagan"}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className={`friend-badge ${!friend.subscribe_user ? 'pending' : ''}`}>
                      <span>{friend.subscribe_user ? '✓' : '⏳'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Earnings History */}
          <div className="earnings-section">
            <h2>{t("referral.earningsHistory") || "Daromad tarixi"}</h2>
            {earnings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p className="empty-text">{t("referral.noEarnings") || "Hali daromad yo'q"}</p>
                <p className="empty-hint">{t("referral.shareToEarn") || "Do'stlaringizni taklif qiling!"}</p>
              </div>
            ) : (
              <div className="earnings-list">
                {earnings.map((earning, idx) => (
                  <div key={idx} className="earning-item">
                    <div className="earning-left">
                      <div className="earning-avatar">👤</div>
                      <div className="earning-info">
                        <p className="referee-name">@{earning.referee_username}</p>
                        <p className="earning-date">
                          {new Date(earning.created_at).toLocaleDateString("uz-UZ", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="earning-right">
                      <p className="earning-amount">+{earning.earned_stars} ⭐</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="withdraw-modal-overlay" onClick={() => !withdrawing && setShowWithdrawModal(false)}>
          <div className="withdraw-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="withdraw-modal-header">
              <h2>{t("referral.withdrawTitle") || "Gift tanlang"}</h2>
              <button className="withdraw-modal-close" onClick={() => !withdrawing && setShowWithdrawModal(false)}>✕</button>
            </div>

            {/* Recipient username */}
            <div className="withdraw-recipient-info">
              <span>{t("referral.sendTo") || "Yuboriladi"}:</span>
              <span className="withdraw-recipient-username">@{username}</span>
            </div>

            {/* Balance info */}
            <div className="withdraw-balance-info">
              <span>{t("referral.yourBalance") || "Sizning balans"}:</span>
              <span className="withdraw-balance-value">{stats.referral_balance} ⭐</span>
            </div>

            {/* Success state */}
            {withdrawSuccess ? (
              <div className="withdraw-success">
                <TGSSticker 
                  stickerPath={getGiftStickerPath(selectedGift?.id)} 
                  className="withdraw-success-sticker"
                  autoplay={true}
                />
                <h3>✅ {t("referral.withdrawSuccess") || "Gift yuborilmoqda!"}</h3>
                <p>@{username}</p>
              </div>
            ) : (
              <>
                {/* Gift Grid */}
                <div className="withdraw-gift-grid">
                  {GIFTS.map((gift) => {
                    const affordable = canAfford(gift);
                    const isSelected = selectedGift?.id === gift.id;
                    return (
                      <div
                        key={gift.id}
                        className={`withdraw-gift-item ${isSelected ? 'selected' : ''} ${!affordable ? 'disabled' : ''}`}
                        onClick={() => affordable && setSelectedGift(gift)}
                        onMouseEnter={() => setHoveredGift(gift.id)}
                        onMouseLeave={() => setHoveredGift(null)}
                      >
                        <TGSSticker
                          stickerPath={getGiftStickerPath(gift.id)}
                          className="withdraw-gift-sticker"
                          autoplay={hoveredGift === gift.id}
                        />
                        <span className={`withdraw-gift-stars ${affordable ? 'affordable' : ''}`}>
                          {gift.stars} ⭐
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Withdraw button */}
                <button
                  className={`withdraw-confirm-btn ${!selectedGift || withdrawing ? 'disabled' : ''}`}
                  onClick={handleWithdraw}
                  disabled={!selectedGift || withdrawing}
                >
                  {withdrawing ? (
                    <>{t("common.loading") || "Yuklanmoqda..."}</>
                  ) : selectedGift ? (
                    <>{t("referral.withdrawGift") || "Yechib olish"} ({selectedGift.stars} ⭐)</>
                  ) : (
                    <>{t("referral.selectGift") || "Gift tanlang"}</>
                  )}
                </button>

                <p className="withdraw-hint">
                  {t("referral.withdrawHint") || "Gift sizning Telegram akkauntingizga yuboriladi"}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* End of main content */}
    </div>
  );
}
