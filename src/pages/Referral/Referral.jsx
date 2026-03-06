import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Referral.css";
import starsGif from "../../assets/stars.gif";
import premiumGif from "../../assets/premium_gif.gif";
import WebApp from "@twa-dev/sdk";
import { useTranslation } from "../../context/LanguageContext";
import { TGSSticker } from "../../components/TGSSticker";
import referralSticker from "../../assets/AnimatedSticker_referal.tgs";
import loadingSticker from "../../assets/Animated_loading.tgs";
import apiFetch from "../../utils/apiFetch";


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

  // My friends state (referrer_username orqali)
  const [myFriends, setMyFriends] = useState([]);
  const [friendsCount, setFriendsCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

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

  // Share function
  const shareLink = async () => {
    if (!referralLink) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "⭐ " + t("referral.title"),
          text: t("referral.shareWithFriends"),
          url: referralLink,
        });
      } else {
        copyLink();
      }
    } catch (err) {
      console.error("Share error:", err);
    }
  };

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
          </div>

          {/* Bonus Info Section */}
          <div className="reward-section">
            <h2>{t("referral.howToEarn") || "Qanday ishlash mumkin?"}</h2>
            <div className="reward-tiers">
              <div className="reward-card">
                <div className="reward-icon">📢</div>
                <div className="reward-content">
                  <h3>{t("referral.subscribeBonus") || "Kanalga obuna"}</h3>
                  <p className="reward-desc">
                    {t("referral.subscribeBonusDesc") || "Do'stingiz kanalga obuna bo'lsa"}
                  </p>
                  <div className="reward-amount bonus-small">+2 ⭐</div>
                </div>
              </div>

              <div className="reward-card featured">
                <div className="reward-icon">🛒</div>
                <div className="reward-content">
                  <h3>{t("referral.purchaseBonus") || "Birinchi xarid"}</h3>
                  <p className="reward-desc">
                    {t("referral.purchaseBonusDesc") || "Do'stingiz birinchi xarid qilsa"}
                  </p>
                  <div className="reward-amount bonus-big">+15 ⭐</div>
                </div>
              </div>
            </div>

            <div className="bonus-info-box">
              <div className="bonus-info-icon">💡</div>
              <div className="bonus-info-text">
                <p><strong>{t("referral.howItWorks") || "Qanday ishlaydi?"}</strong></p>
                <p>{t("referral.step1") || "1. Havolani do'stingizga yuboring"}</p>
                <p>{t("referral.step2") || "2. Do'stingiz kanalga obuna bo'lsa — +2 ⭐ olasiz"}</p>
                <p>{t("referral.step3") || "3. Do'stingiz xarid qilsa — +15 ⭐ qo'shimcha olasiz"}</p>
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
                  <div key={idx} className="friend-item">
                    <div className="friend-left">
                      <div className="friend-avatar">👤</div>
                      <div className="friend-info">
                        <p className="friend-name">@{friend.username}</p>
                        <p className="friend-date">
                          {new Date(friend.created_at).toLocaleDateString("uz-UZ", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="friend-badge">
                      <span>✓</span>
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

      {/* End of main content */}
    </div>
  );
}
