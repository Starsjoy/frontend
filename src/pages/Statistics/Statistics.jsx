import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../../context/LanguageContext";
import WebApp from "@twa-dev/sdk";
import apiFetch from "../../utils/apiFetch";
import starsGif from "../../assets/stars.gif";
import premiumGif from "../../assets/premium_gif.gif";
import "./Statistics.css";

const formatAmount = (num) =>
  Number(num || 0).toLocaleString("ru-RU");

export default function Statistics() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [username, setUsername] = useState(null);
  const [isTelegram, setIsTelegram] = useState(false);
  const [statsTab, setStatsTab] = useState("sales");
  const [period, setPeriod] = useState("daily");
  const [refPeriod, setRefPeriod] = useState("daily");
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [referralBoard, setReferralBoard] = useState([]);
  const [myRefRank, setMyRefRank] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Telegram user
  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.setHeaderColor("#1a1a2e");
      WebApp.setBackgroundColor("#1a1a2e");

      // Back button
      WebApp.BackButton.show();
      WebApp.BackButton.onClick(() => navigate("/"));

      const tgUser =
        WebApp?.initDataUnsafe?.user?.username ||
        window?.Telegram?.WebApp?.initDataUnsafe?.user?.username;

      if (tgUser) {
        const clean = tgUser.replace("@", "");
        setUsername(clean);
        setIsTelegram(true);
      }
    } catch {
      setIsTelegram(false);
    }

    return () => {
      try { WebApp.BackButton.hide(); } catch {}
    };
  }, []);

  // Load sales leaderboard
  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (username) params.set("username", username);
        if (period !== "all") params.set("period", period);
        const qs = params.toString() ? `?${params.toString()}` : "";
        const res = await apiFetch(`/api/stats/leaderboard${qs}`);
        const json = await res.json();
        setLeaderboard(json.top10 || []);
        setMyRank(json.me || null);
      } catch {
        setError(t("statistics.loadError") || "Statistikani yuklashda xatolik");
      } finally {
        setLoading(false);
      }
    };
    loadLeaderboard();
  }, [username, period]);

  // Load referral leaderboard
  useEffect(() => {
    const loadReferralBoard = async () => {
      try {
        const params = new URLSearchParams();
        if (username) params.append("username", username);
        params.append("period", refPeriod);
        const res = await apiFetch(`/api/referral/leaderboard?${params.toString()}`);
        const json = await res.json();
        setReferralBoard(json.top10 || []);
        setMyRefRank(json.me || null);
      } catch (e) {
        console.error("Ref stats error:", e);
      }
    };
    loadReferralBoard();
  }, [username, refPeriod]);

  const getMedal = (i) => {
    if (i === 0) return "🥇";
    if (i === 1) return "🥈";
    if (i === 2) return "🥉";
    return `#${i + 1}`;
  };

  return (
    <div className="statistics-root">
      {/* Header */}
      <header className="statistics-header">
        <button className="statistics-back" onClick={() => navigate("/")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h1 className="statistics-title">
          🏆 {t("statistics.title") || "Statistika"}
        </h1>
        <div style={{width: 36}}></div>
      </header>

      {/* Tab Switcher */}
      <div className="statistics-tabs">
        <button
          className={`statistics-tab ${statsTab === "sales" ? "active" : ""}`}
          onClick={() => setStatsTab("sales")}
        >
          <img src={starsGif} className="statistics-tab-icon" alt="" />
          {t("statistics.sales") || "Savdo"}
        </button>
        <button
          className={`statistics-tab ${statsTab === "referral" ? "active" : ""}`}
          onClick={() => setStatsTab("referral")}
        >
          <img src={premiumGif} className="statistics-tab-icon" alt="" />
          {t("statistics.referral") || "Referal"}
        </button>
      </div>

      {/* Content */}
      <div className="statistics-content">

        {/* Period Filter - only for sales tab */}
        {statsTab === "sales" && (
          <div className="statistics-period-filters">
            {["daily", "weekly", "monthly"].map((p) => (
              <button
                key={p}
                className={`statistics-period-btn ${period === p ? "active" : ""}`}
                onClick={() => setPeriod(p)}
              >
                {t(`statistics.period_${p}`) || 
                  (p === "daily" ? "Bugun" : p === "weekly" ? "Hafta" : "Oy")
                }
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="statistics-skeleton">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="statistics-skeleton-row"></div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && <p className="statistics-error">{error}</p>}

        {/* SALES TAB */}
        {statsTab === "sales" && !loading && !error && (
          <>
            {leaderboard.length === 0 ? (
              <div className="statistics-empty">
                {t("statistics.noOrders") || "Hozircha ma'lumot yo'q"}
              </div>
            ) : (
              <div className="statistics-list">
                {leaderboard.map((u, i) => (
                  <div
                    key={u.owner_user_id || i}
                    className={`statistics-row ${i < 3 ? `top-${i + 1}` : ""}`}
                  >
                    <span className="statistics-rank">{getMedal(i)}</span>
                    <span className="statistics-user">{u.name || u.username}</span>
                    <span className="statistics-value">
                      {formatAmount(u.total || u.total_spent)} so'm
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* My rank */}
            {isTelegram && !loading && (
              <div className="statistics-my-section">
                <div className="statistics-my-label">
                  {t("statistics.myPosition") || "Sizning o'rningiz"}
                </div>
                {myRank ? (
                  <div className="statistics-row me">
                    <span className="statistics-rank">#{myRank.rank || myRank}</span>
                    <span className="statistics-user">
                      {myRank.nickname || myRank.name}
                    </span>
                    <span className="statistics-value">
                      {formatAmount(myRank.total || myRank.my_total)} so'm
                    </span>
                  </div>
                ) : (
                  <div className="statistics-empty small">
                    {t("statistics.noPurchases") || "Siz hali xarid qilmagansiz"}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* REFERRAL TAB */}
        {statsTab === "referral" && !loading && (
          <>
            {/* Period Filter for Referral */}
            <div className="statistics-period-filters">
              {["daily", "weekly", "monthly"].map((p) => (
                <button
                  key={p}
                  className={`statistics-period-btn ${refPeriod === p ? "active" : ""}`}
                  onClick={() => setRefPeriod(p)}
                >
                  {t(`statistics.period_${p}`) || 
                    (p === "daily" ? "Bugun" : p === "weekly" ? "Hafta" : "Oy")
                  }
                </button>
              ))}
            </div>
            
            {referralBoard.length === 0 ? (
              <div className="statistics-empty">
                {t("statistics.noReferrals") || "Hozircha referallar yo'q"}
              </div>
            ) : (
              <div className="statistics-list">
                {referralBoard.slice(0, 10).map((u, i) => (
                  <div
                    key={u.user_id || i}
                    className={`statistics-row ${i < 3 ? `top-${i + 1}` : ""}`}
                  >
                    <span className="statistics-rank">{getMedal(i)}</span>
                    <span className="statistics-user">{u.nickname}</span>
                    <span className="statistics-value">
                      {u.referrals} {t("statistics.friends") || "do'st"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* My referral rank */}
            {isTelegram && (
              <div className="statistics-my-section">
                <div className="statistics-my-label">
                  {t("statistics.myPosition") || "Sizning o'rningiz"}
                </div>
                {myRefRank ? (
                  <div className="statistics-row me">
                    <span className="statistics-rank">#{myRefRank.rank}</span>
                    <span className="statistics-user">
                      {myRefRank.nickname}
                    </span>
                    <span className="statistics-value">
                      {myRefRank.referrals} {t("statistics.friends") || "do'st"}
                    </span>
                  </div>
                ) : (
                  <div className="statistics-empty small">
                    {t("statistics.noFriendsYet") || "Siz hali do'st taklif qilmagansiz"}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
