import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import WebApp from "@twa-dev/sdk";
import { useTranslation } from "../../context/LanguageContext";
import { TGSSticker } from "../../components/TGSSticker";
import apiFetch from "../../utils/apiFetch";
import "./Notifications.css";

import bellSticker from "../../assets/AnimatedSticker_news.tgs";

// Notification type icons
const TYPE_ICONS = {
  info: "ℹ️",
  success: "✅",
  warning: "⚠️",
  promo: "🎁",
  system: "🔔",
};

// Format relative time
const formatRelativeTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return "Hozir";
  if (diff < 3600) return `${Math.floor(diff / 60)} daqiqa oldin`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} soat oldin`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} kun oldin`;
  
  return date.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

export default function Notifications() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

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

  // Get user ID
  useEffect(() => {
    const uid = localStorage.getItem("userId");
    if (uid) {
      setUserId(uid);
    }
  }, []);

  // Load notifications
  useEffect(() => {
    if (!userId) return;

    const loadNotifications = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/notifications/${userId}`);
        const data = await res.json();

        if (data.success) {
          setNotifications(data.notifications || []);
          // Mark all as read
          await apiFetch(`/api/notifications/read-all/${userId}`, {
            method: "POST",
          });
        }
      } catch (err) {
        console.error("Load notifications error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [userId]);

  // Mark single notification as read
  const markAsRead = async (id) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error("Mark as read error:", err);
    }
  };

  return (
    <div className="notifications-page">
      {/* Header */}
      <div className="notifications-header">
        <div className="notifications-sticker-container">
          <TGSSticker stickerPath={bellSticker} className="notifications-sticker" />
        </div>
        <h1>{t("notifications.title") || "Bildirishnomalar"}</h1>
        <p className="notifications-subtitle">
          {t("notifications.subtitle") || "Yangiliklar va xabarlar"}
        </p>
      </div>

      {/* Content */}
      {notifications.length === 0 ? (
            <div className="notifications-empty">
              <div className="empty-icon">🔔</div>
              <h3>{t("notifications.noNotifications") || "Bildirishnomalar yo'q"}</h3>
              <p>{t("notifications.emptyHint") || "Yangi xabarlar shu yerda ko'rinadi"}</p>
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${notif.is_read ? "read" : "unread"} type-${notif.type}`}
                  onClick={() => !notif.is_read && markAsRead(notif.id)}
                >
                  <div className="notification-icon">
                    {TYPE_ICONS[notif.type] || TYPE_ICONS.info}
                  </div>
                  <div className="notification-content">
                    <div className="notification-header">
                      <h4 className="notification-title">{notif.title}</h4>
                      {notif.is_global && (
                        <span className="notification-global-badge">
                          {t("notifications.global") || "Umumiy"}
                        </span>
                      )}
                    </div>
                    <p className="notification-message">{notif.message}</p>
                    <span className="notification-time">
                      {formatRelativeTime(notif.created_at)}
                    </span>
                  </div>
                  {!notif.is_read && <div className="notification-unread-dot"></div>}
                </div>
              ))}
            </div>
          )}
    </div>
  );
}
