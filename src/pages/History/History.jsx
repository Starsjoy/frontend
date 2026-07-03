import React, { useEffect, useState } from "react";
import { useTranslation } from "../../context/LanguageContext";
import { TGSSticker } from "../../components/TGSSticker";
import "./History.css";
import WebApp from "@twa-dev/sdk";
import buyurtmalarSticker from "../../assets/AnimatedSticker_buyurtmalar.tgs";
import starsGif from "../../assets/stars.gif";
import diamondGif from "../../assets/diamond.gif";
import apiFetch from "../../utils/apiFetch";

const getGiftStickerPath = (giftId) => {
  if (!giftId) return null;
  try {
    return new URL(`../../assets/${giftId}.tgs`, import.meta.url).href;
  } catch {
    return null;
  }
};

function resolveOrderKind(item) {
  const k = String(item?.kind || "").toLowerCase();
  if (k === "gift" || item?.gift_id) return "gift";
  if (k.includes("premium")) return "premium";
  return "stars";
}

function formatUsername(username) {
  if (!username) return null;
  const clean = String(username).replace(/^@/, "").trim();
  return clean ? `@${clean}` : null;
}

function formatHistoryDateTime(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  const date = d.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `${time} · ${date}`;
}

function getOrderTitle(item) {
  const kind = resolveOrderKind(item);
  if (kind === "gift") {
    const stars = item.stars ?? item.type_amount;
    return stars ? `Gift · ${Number(stars).toLocaleString()} ⭐` : "Gift";
  }
  if (kind === "premium") {
    const months = item.months ?? item.type_amount ?? item.stars;
    return `Premium · ${months} oy`;
  }
  const stars = item.stars ?? item.type_amount;
  return `${Number(stars || 0).toLocaleString()} Stars`;
}

export default function History() {
  const { t } = useTranslation();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  const formatAmount = (num) => Number(num || 0).toLocaleString("ru-RU");

  useEffect(() => {
    try {
      WebApp.ready();
      const tgUserId =
        WebApp?.initDataUnsafe?.user?.id ||
        window?.Telegram?.WebApp?.initDataUnsafe?.user?.id;

      if (tgUserId) {
        loadHistory(String(tgUserId));
      }
    } catch (err) {
      console.error("Telegram error:", err);
    }
  }, []);

  const loadHistory = async (uid) => {
    try {
      setLoading(true);
      setError(null);

      const res = await apiFetch(`/api/user/history/${uid}`);
      const json = await res.json();

      setHistory(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error("History error:", err);
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case "pending":
      case "processing":
        return {
          label: t("stars.paymentPending") || "Kutilmoqda",
          class: "pending",
          filterKey: "pending",
        };
      case "stars_sent":
      case "premium_sent":
      case "gift_sent":
      case "completed":
      case "sent":
      case "delivered":
        return {
          label: t("stars.paymentSuccess") || "Bajarildi",
          class: "success",
          filterKey: "success",
        };
      case "failed":
      case "error":
        return {
          label: t("stars.paymentFailed") || "Bekor qilindi",
          class: "failed",
          filterKey: "failed",
        };
      case "expired":
        return { label: "Eskirgan", class: "expired", filterKey: "expired" };
      default:
        return { label: status, class: "default", filterKey: "all" };
    }
  };

  const filteredHistory = history.filter((item) => {
    if (filter === "all") return true;
    const statusInfo = getStatusInfo(item.status);
    return statusInfo.filterKey === filter;
  });

  return (
    <div className="history-page">
      <div className="history-header centered-header">
        <div className="history-sticker-container">
          <TGSSticker stickerPath={buyurtmalarSticker} className="history-sticker" />
        </div>
        <h1>Buyurtmalar bo'limi</h1>
      </div>

      <div className="history-filter-tabs">
        <button
          className={`filter-tab ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          Barchasi
        </button>
        <button
          className={`filter-tab filter-success ${filter === "success" ? "active" : ""}`}
          onClick={() => setFilter("success")}
        >
          ✓ Muvaffaqiyatli
        </button>
        <button
          className={`filter-tab filter-failed ${filter === "failed" ? "active" : ""}`}
          onClick={() => setFilter("failed")}
        >
          ✕ Muvaffaqiyatsiz
        </button>
        <button
          className={`filter-tab filter-expired ${filter === "expired" ? "active" : ""}`}
          onClick={() => setFilter("expired")}
        >
          ⏱ Eskirgan
        </button>
        <button
          className={`filter-tab filter-pending ${filter === "pending" ? "active" : ""}`}
          onClick={() => setFilter("pending")}
        >
          ⏳ Kutilmoqda
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <p>{t("common.loading")}</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <p>{error}</p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p className="empty-text">
            {filter === "all" ? t("dashboard.noOrders") : `Bu kategoriyada buyurtma yo'q`}
          </p>
          <p className="empty-hint">
            {t("history.emptyHint") || "Buyurtmalaringiz shu yerda ko'rinadi"}
          </p>
        </div>
      ) : (
        <div className="history-list-container">
          <ul className="history-list">
            {filteredHistory.map((item) => {
              const statusInfo = getStatusInfo(item.status);
              const isPending = statusInfo.filterKey === "pending";
              const kind = resolveOrderKind(item);
              const recipient = formatUsername(item.username);
              const giftSticker =
                kind === "gift" && item.gift_id ? getGiftStickerPath(item.gift_id) : null;

              return (
                <li
                  key={`${kind}-${item.id}`}
                  className={`history-item item-${statusInfo.class} ${isPending ? "item-pending-anim" : ""}`}
                >
                  <div className={`history-badge history-badge--${kind}`}>
                    {isPending ? (
                      <div className="pending-spinner" />
                    ) : kind === "gift" && giftSticker ? (
                      <TGSSticker
                        stickerPath={giftSticker}
                        className="history-gift-sticker"
                        autoplay={false}
                        loop={false}
                      />
                    ) : (
                      <img
                        src={kind === "premium" ? diamondGif : starsGif}
                        alt={kind}
                        className="history-icon-img"
                      />
                    )}
                  </div>

                  <div className="history-content">
                    <div className="history-row">
                      <span className="history-title">{getOrderTitle(item)}</span>
                      <span className="history-amount">{formatAmount(item.amount)} so'm</span>
                    </div>

                    {recipient && (
                      <div className="history-row history-row--username">
                        <span className="history-username">{recipient}</span>
                      </div>
                    )}

                    <div className="history-row meta-row">
                      <span className="history-date">{formatHistoryDateTime(item.created_at)}</span>
                      <span className={`history-status-badge status-${statusInfo.class}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
