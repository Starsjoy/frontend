import React, { useEffect, useState } from "react";
import { useTranslation } from "../../context/LanguageContext";
import "./Challenges.css";
import WebApp from "@twa-dev/sdk";
import apiFetch from "../../utils/apiFetch";
import { TGSSticker } from "../../components/TGSSticker";
import MissionSticker from "../../assets/AnimatedSticker_mission.tgs";
import BannerSticker from "../../assets/AnimatedSticker_banner.tgs";import BannerSticker2 from "../../assets/AnimatedSticker_banner2.tgs";import diamondGif from "../../assets/diamond.gif";
import starsGif from "../../assets/stars.gif";
import { getTgUser } from "../../utils/webSession";

export default function Challenges() {
  const { t } = useTranslation();
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [username, setUsername] = useState(null);
  const [userProgress, setUserProgress] = useState({
    totalSpent: 0,
    purchaseCount: 0,
    claimedChallenges: [],
  });
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  // Sample challenges data
  const challenges = [
    {
      id: 1,
      description: "999,000 so'm xarid qiling",
      amount: 999000,
      reward: "NFT #001",
      rewardType: "nft",
      sticker: BannerSticker,
      completed: false,
      details:
        "Jami 999,000 so'm miqdorida xarid qiling va noyob NFT kolleksiyasiga ega bo'ling! Bu imkoniyat faqat eng faol foydalanuvchilar uchun.",
      claimable: true,
    },
    {
      id: 5,
      description: "1,999,000 so'm xarid qiling",
      amount: 1999000,
      reward: "NFT #002",
      rewardType: "nft",
      sticker: BannerSticker2,
      completed: false,
      details:
        "Jami 1,999,000 so'm miqdorida xarid qiling va maxsus NFT kolleksiyasiga ega bo'ling! Bu noyob raqamli aktiv.",
      claimable: true,
    },
  ];

  // Get Telegram user info
  useEffect(() => {
    try {
      WebApp.ready();
      const tgUser =
        getTgUser()?.username;
      const tgUserId =
        getTgUser()?.id;

      if (tgUser) {
        const clean = tgUser.replace("@", "");
        setUsername(clean);
        localStorage.setItem("username", clean);
      }
      if (tgUserId) {
        localStorage.setItem("userId", String(tgUserId));
        fetchUserProgress(String(tgUserId));
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Telegram error:", err);
      setLoading(false);
    }
  }, []);

  // Fetch user progress from backend (by userId)
  const fetchUserProgress = async (uid) => {
    try {
      setLoading(true);
      
      // Get user history/transactions by owner_user_id
      const res = await apiFetch(`/api/user/history/${uid}`);
      const history = await res.json();

      if (Array.isArray(history)) {
        // Calculate total spent (sum of all stars and premium purchases)
        let totalSpent = 0;
        let purchaseCount = 0;

        history.forEach((item) => {
          // Faqat muvaffaqiyatli (sent) buyurtmalarni hisoblash
          const isSuccess = 
            item.status === "stars_sent" || 
            item.status === "premium_sent" || 
            item.status === "completed";

          if (isSuccess) {
            if (item.amount) {
              totalSpent += parseInt(item.amount) || 0;
            }
            purchaseCount++;
          }
        });

        // Get claimed challenges from localStorage
        const claimedKey = `claimed_challenges_${user}`;
        const claimed = JSON.parse(localStorage.getItem(claimedKey) || "[]");

        setUserProgress({
          totalSpent,
          purchaseCount,
          claimedChallenges: claimed,
        });
      }
    } catch (err) {
      console.error("Error fetching progress:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate challenge progress
  const getChallengeProgress = (challenge) => {
    let progress = 0;
    let completed = false;
    let isClaimed = userProgress.claimedChallenges.includes(challenge.id);

    if (challenge.amount) {
      progress = Math.min(
        100,
        Math.round((userProgress.totalSpent / challenge.amount) * 100)
      );
      completed = userProgress.totalSpent >= challenge.amount;
    } else if (challenge.purchases) {
      progress = Math.min(
        100,
        Math.round((userProgress.purchaseCount / challenge.purchases) * 100)
      );
      completed = userProgress.purchaseCount >= challenge.purchases;
    }

    return { progress, completed, isClaimed };
  };

  // Claim challenge reward
  const handleClaimReward = async (challenge) => {
    if (!username) {
      alert("Username topilmadi!");
      return;
    }

    const { completed } = getChallengeProgress(challenge);
    if (!completed) {
      alert("Challenge hali tugallalmadi!");
      return;
    }

    setClaiming(true);
    try {
      // Claim to backend (optional, for record keeping)
      // We ignore errors here for now as per requirement
      try {
        await apiFetch("/api/challenges/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            challengeId: challenge.id,
          }),
        });
      } catch (e) {
        console.warn("Backend claim failed, but proceeding locally:", e);
      }

      // Save to localStorage
      const claimedKey = `claimed_challenges_${username}`;
      const claimed = JSON.parse(localStorage.getItem(claimedKey) || "[]");
      if (!claimed.includes(challenge.id)) {
        claimed.push(challenge.id);
        localStorage.setItem(claimedKey, JSON.stringify(claimed));
      }

      setUserProgress((prev) => ({
        ...prev,
        claimedChallenges: claimed,
      }));

      alert(`✅ ${challenge.reward} yuborildi!`);
      setSelectedChallenge(null);
    } catch (err) {
      console.error("Claim error:", err);
      alert("Xatolik yuz berdi!");
    } finally {
      setClaiming(false);
    }
  };

  // Calculate total completed
  const completedCount = challenges.filter(c => getChallengeProgress(c).completed).length;
  const totalChallenges = challenges.length;

  return (
    <div className="challenges-page">
      <div className="challenges-header">
        <div className="header-title-section-redesign">
          <div className="mission-sticker-container">
               <TGSSticker stickerPath={MissionSticker} />
          </div>
          <h2 className="challenges-custom-subtitle">Maqsadlarni bajaring va kafolatlangan nft oling!</h2>
        </div>
      </div>

      {loading ? (
        <div className="loading-challenges">{t("common.loading")}</div>
      ) : (
        <div className="challenges-container">
          {challenges.map((challenge) => {
            const { progress, completed, isClaimed } =
              getChallengeProgress(challenge);

            return (
              <div
                key={challenge.id}
                className={`challenge-card ${completed ? "completed" : ""}`}
                onClick={() => setSelectedChallenge(challenge)}
              >
                {isClaimed && (
                  <div className="completed-badge">
                    ✅ {t("challenges.claimed") || "Olingan"}
                  </div>
                )}

                <div className="challenge-img-wrapper">
                    <TGSSticker stickerPath={challenge.sticker} className="challenge-img-icon" />
                </div>

                <div className="challenge-content">
                  <h3 className="challenge-title">{challenge.title}</h3>
                  <p className="challenge-description">
                    {challenge.description}
                  </p>

                  <div className="challenge-progress-section">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">{progress}%</span>
                  </div>

                  <div className="challenge-reward">
                    <span className="reward-label">
                      {t("challenges.reward") || "Reward:"}
                    </span>
                    <span className="reward-value">{challenge.reward}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Challenge Details Modal */}
      {selectedChallenge && (
        <div className="challenge-modal-overlay">
          <div className="challenge-modal">
            <button
              className="modal-close-btn"
              onClick={() => setSelectedChallenge(null)}
            >
              ✕
            </button>

            <div className="modal-header">
              <div className="modal-icon-img-wrapper">
                  <TGSSticker stickerPath={selectedChallenge.sticker} className="modal-icon-img" />
              </div>
              <h2>{selectedChallenge.title}</h2>
            </div>

            <div className="modal-progress">
              <div className="progress-bar-large">
                <div
                  className="progress-fill"
                  style={{
                    width: `${getChallengeProgress(selectedChallenge).progress}%`,
                  }}
                ></div>
              </div>
              <div className="progress-stats">
                {selectedChallenge.amount && (
                  <>
                    <span className="stat">
                      {t("challenges.spent") || "Xarid:"}:{" "}
                      <strong>
                        {userProgress.totalSpent?.toLocaleString("ru-RU") ||
                          "0"}{" "}
                        so'm
                      </strong>
                    </span>
                    <span className="stat-separator">/</span>
                    <span className="stat">
                      {selectedChallenge.amount?.toLocaleString("ru-RU")}{" "}
                      so'm
                    </span>
                  </>
                )}
                {selectedChallenge.purchases && (
                  <>
                    <span className="stat">
                      {t("challenges.purchases") || "Xaridlar:"}:{" "}
                      <strong>{userProgress.purchaseCount}</strong>
                    </span>
                    <span className="stat-separator">/</span>
                    <span className="stat">{selectedChallenge.purchases}</span>
                  </>
                )}
              </div>
            </div>

            <div className="modal-details">
              <h3>{t("challenges.howToWin") || "Qanday yutish kerak:"}</h3>
              <p>{selectedChallenge.details}</p>
            </div>

            <div className="modal-reward">
              <h3>{t("challenges.reward") || "Reward:"}</h3>
              <div className="reward-display">
                 <div className="reward-icon-small">
                    <TGSSticker stickerPath={selectedChallenge.sticker} />
                 </div>
                <div className="reward-info">
                  <p className="reward-title">{selectedChallenge.reward}</p>
                  <p className="reward-type">
                    ({selectedChallenge.rewardType.toUpperCase()})
                  </p>
                </div>
              </div>
            </div>

            {getChallengeProgress(selectedChallenge).isClaimed ? (
              <div className="modal-status-claimed">
                ✅ {t("challenges.alreadyClaimed") || "Siz bu reward'ni olganingiz!"}
              </div>
            ) : getChallengeProgress(selectedChallenge).completed ? (
              <>
                <div className="modal-status-completed">
                  ✅ {t("challenges.completed") || "Bu challenge tugallandi!"}
                </div>
                <button
                  className="modal-claim-btn"
                  onClick={() => handleClaimReward(selectedChallenge)}
                  disabled={claiming}
                >
                  {claiming ? "Yuborilmoqda..." : "🎁 Olib olish"}
                </button>
              </>
            ) : (
              <div className="modal-status-pending">
                ⏳{" "}
                {t("challenges.inProgress") ||
                  "Siz bu challenge ustida ishlayapsiz..."}
              </div>
            )}

            <button
              className="modal-close-action"
              onClick={() => setSelectedChallenge(null)}
            >
              {t("common.close") || "Yopish"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
