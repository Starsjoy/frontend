import React, { useEffect, useState, useRef } from "react";
import starsSticker from "../../assets/AnimatedSticker_stars.tgs";
import { TGSSticker } from "../../components/TGSSticker";
import { useNavigate, useLocation } from "react-router-dom";
import WebApp from "@twa-dev/sdk";
import apiFetch from "../../utils/apiFetch";
import { usePaymentCard } from "../../hooks/usePaymentCard";
import PaymentTransfer from "../../components/PaymentTransfer/PaymentTransfer";
import PaymentStatus from "../../components/PaymentTransfer/PaymentStatus";
import { toStage, resolvePolledStatus } from "../../components/PaymentTransfer/paymentStage";
import "./Discount.css";

const POLLING_DURATION = 8 * 60 * 1000;

export default function Discount() {
  // Karta serverdan keladi — admin switchi (UZCARD ⇄ HUMO) qayta build
  // qilmasdan darhol qo'llanadi. API ishlamasa eski VITE_ qiymatiga tushadi.
  const paymentCard = usePaymentCard();
  const CARD_NUMBER = paymentCard.display;
  const CARD_NAME = paymentCard.name;
  const NARX = parseInt(import.meta.env.VITE_NARX); // 240 so'm per star

  // Discount packages from API
  const [discountPackages, setDiscountPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(true);

  const [username, setUsername] = useState("");
  const [selectedOption, setSelectedOption] = useState(null);
  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("payment_info");
  // Polling interval ichida eski closure emas, joriy status kerak
  const statusRef = useRef(status);
  statusRef.current = status;
  const [txId, setTxId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [timer, setTimer] = useState(20);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [countdown, setCountdown] = useState(480);

  const pollingRef = useRef(null);
  const countdownRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Fetch discount packages from API
  useEffect(() => {
    const handleBack = () => {
      if (showModal) {
        setShowModal(false);
      } else {
        navigate("/");
      }
    };

    try {
      WebApp.ready();
      WebApp.BackButton.show();
      WebApp.BackButton.onClick(handleBack);
    } catch (e) {
      console.warn("Telegram WebApp not ready", e);
    }

    const fetchPackages = async () => {
      try {
        const res = await apiFetch("/api/discount-packages");
        const data = await res.json();
        // Map to expected format with slot pricing
        const packages = data.map(pkg => ({
          id: pkg.id,
          stars: pkg.stars,
          basePrice: pkg.stars * NARX, // To'g'ri asl narx (slot pricing oldingi)
          discountedPrice: pkg.current_price, // Slot-based chegirma narxi
          discount: pkg.discount_percent,
          slotAvailable: pkg.slot_available !== false,
          availableSlots: pkg.available_slots || 20
        }));
        setDiscountPackages(packages);

        // Agar home.jsx dan tanlangan paket bo'lsa - avtomatik select qil
        if (location.state?.selectedPackageId) {
          const selectedPkg = packages.find(p => p.id === location.state.selectedPackageId);
          if (selectedPkg) {
            setSelectedOption(selectedPkg);
          }
        }
      } catch (err) {
        console.error("❌ Paketlarni yuklashda xato:", err);
      } finally {
        setPackagesLoading(false);
      }
    };
    fetchPackages();

    return () => {
      try {
        if (!showModal) {
          WebApp.BackButton.offClick(handleBack);
          WebApp.BackButton.hide();
        }
      } catch (e) {}
    };
  }, [location.state?.selectedPackageId, showModal, navigate]);

  const goToHome = () => {
    setShowModal(false);
    navigate("/");
  };

  // Telegramdan username olish
  const fillMyUsername = () => {
    try {
      const tgUser = window?.Telegram?.WebApp?.initDataUnsafe?.user?.username;
      if (!tgUser) {
        alert("Telegram username topilmadi");
        return;
      }
      setUsername(tgUser);
    } catch (err) {
      console.error("Telegram username olishda xato:", err);
    }
  };

  const formatAmount = (num) =>
    num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  // Timer for stars_sent
  useEffect(() => {
    if (status === "stars_sent") {
      const countdownInterval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setShowModal(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(countdownInterval);
    }
  }, [status]);

  // Telegram username auto-fill
  useEffect(() => {
    try {
      const tgUser = window?.Telegram?.WebApp?.initDataUnsafe?.user?.username;
      if (tgUser) {
        setUsername(tgUser);
      }
    } catch (err) {
      console.error("Telegram username olishda xato:", err);
    }
  }, []);

  // Real-time search (RobynHood API)
  useEffect(() => {
    if (!username) {
      setProfile(null);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setLoadingProfile(true);
        const cleanUsername = username.startsWith("@")
          ? username.slice(1)
          : username;

        const profileRes = await apiFetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: cleanUsername }),
        });

        const data = await profileRes.json();
        if (profileRes.ok) setProfile(data);
        else setProfile(null);
      } catch (err) {
        console.error("❌ Profil qidiruv xato:", err);
        setProfile(null);
      } finally {
        setLoadingProfile(false);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [username]);

  // Polling functions
  useEffect(() => {
    const savedOrder = localStorage.getItem("pendingDiscountOrder");
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        const createdAt = new Date(parsed.createdAt).getTime();
        const now = Date.now();
        const elapsed = now - createdAt;

        if (elapsed < POLLING_DURATION) {
          setOrder(parsed.order);
          setStatus(parsed.status || "payment_info");

          const remainingMs = POLLING_DURATION - elapsed;
          const remainingSec = Math.floor(remainingMs / 1000);
          setCountdown(remainingSec);

          // Only start polling if status is pending (not payment_info)
          if (parsed.status === "pending" || parsed.status === "payment_received") {
            startPolling(parsed.order);
          }
          startCountdownTimer(remainingSec);

          if (parsed.status === "payment_info" || parsed.status === "pending" || parsed.status === "payment_received") {
            setShowModal(true);
          }
        } else {
          localStorage.removeItem("pendingDiscountOrder");
        }
      } catch (e) {
        localStorage.removeItem("pendingDiscountOrder");
      }
    }

    return () => {
      stopPolling();
      stopCountdown();
    };
  }, []);

  const startPolling = (orderData) => {
    stopPolling();

    pollingRef.current = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/transactions/${orderData.id}`);
        const data = await res.json();

        const nextStatus = resolvePolledStatus(statusRef.current, data.status);
        if (nextStatus !== statusRef.current) {
          statusRef.current = nextStatus;
          setStatus(nextStatus);

          const saved = localStorage.getItem("pendingDiscountOrder");
          if (saved) {
            const parsed = JSON.parse(saved);
            parsed.status = nextStatus;
            localStorage.setItem("pendingDiscountOrder", JSON.stringify(parsed));
          }
        }

        if (data.status === "stars_sent") {
          stopPolling();
          stopCountdown();
          localStorage.removeItem("pendingDiscountOrder");
          setTxId(data.transaction_id);
          setShowModal(true);
        }

        if (["expired", "failed", "error"].includes(data.status)) {
          stopPolling();
          stopCountdown();
          localStorage.removeItem("pendingDiscountOrder");
        }
      } catch (err) {
        console.error("⚠️ Status olish xato:", err);
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startCountdownTimer = (initialSeconds = 480) => {
    stopCountdown();
    setCountdown(initialSeconds);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          stopCountdown();
          stopPolling();
          localStorage.removeItem("pendingDiscountOrder");
          setStatus("expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const saveOrderToStorage = (orderData, orderStatus = "payment_info") => {
    const data = {
      order: orderData,
      createdAt: new Date().toISOString(),
      status: orderStatus,
    };
    localStorage.setItem("pendingDiscountOrder", JSON.stringify(data));
  };

  // Handle option select
  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };

  // Create order
  const handlePayment = async () => {
    if (!selectedOption) {
      alert("Iltimos, paketni tanlang!");
      return;
    }

    if (!username) {
      alert("Iltimos, username kiriting!");
      return;
    }

    if (!profile || !profile.recipient) {
      alert("Foydalanuvchi topilmadi!");
      return;
    }

    try {
      const res = await apiFetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: profile.username,
          recipient: profile.recipient,
          stars: selectedOption.stars,
          discount_package_id: selectedOption.id, // Slot tizimi uchun
        }),
      });

      // Error tekshirish
      if (!res.ok) {
        const errorData = await res.json();
        
        // SLOTS_FULL xatosi
        if (errorData.code === "SLOTS_FULL") {
          alert("⏳ Bu chegirma paketi uchun juda ko'p buyurtmalar mavjud.\n\nIltimos, 1-2 daqiqadan keyin qayta urinib ko'ring.");
          return;
        }
        
        throw new Error(errorData.error || "Server xatosi");
      }

      const newOrder = await res.json();
      setOrder(newOrder);
      setStatus("payment_info");
      setShowModal(true);

      saveOrderToStorage(newOrder, "payment_info");
      startCountdownTimer(480);
    } catch (err) {
      console.error("❌ Order yaratishda xato:", err);
      alert("Order yaratishda xato");
    }
  };

  // To'lov qildim bosilganda
  const handlePaymentDone = () => {
    setStatus("pending");
    // Update localStorage
    const savedOrder = localStorage.getItem("pendingDiscountOrder");
    if (savedOrder) {
      const parsed = JSON.parse(savedOrder);
      parsed.status = "pending";
      localStorage.setItem("pendingDiscountOrder", JSON.stringify(parsed));
    }
    // Start polling
    if (order) {
      startPolling(order);
    }
  };

  return (
    <div className="discount-container">
      <div className="discount-header-container">
        <TGSSticker stickerPath={starsSticker} className="discount-header-sticker" />
      </div>

      <div className="discount-page-title">
        <h1>Chegirma Paketlari</h1>
        <p>Maxsus narxlarda Stars xarid qiling</p>
      </div>

      {/* Profile */}
      {profile && (
        <div className="profile-preview-small">
          <img
            src={profile.imageUrl || "../src/assets/default_image.png"}
            className="profile-img-small"
          />
          <div className="profile-info">
            <div className="name">{profile.fullName}</div>
            <div className="username">@{profile.username}</div>
          </div>
        </div>
      )}

      {loadingProfile && (
        <div className="loader-arc">
          <div className="loader-arc-1"></div>
          <div className="loader-arc-2">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}

      {/* Username Input */}
      <div className="search-row">
        <div className="username-row" style={{ width: "100%" }}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Foydalanuvchi nomi @username"
          />
          {window?.Telegram?.WebApp && (
            <button type="button" className="btn-my" onClick={fillMyUsername}>
              O'zim
            </button>
          )}
        </div>
      </div>

      {/* Package Options */}
      <div className="discount-packages">
        <p className="discount-section-title">Paketni tanlang:</p>
        {packagesLoading ? (
          <div className="packages-loading">⏳ Paketlar yuklanmoqda...</div>
        ) : discountPackages.length === 0 ? (
          <div className="packages-empty">Hozircha chegirma paketlari yo'q</div>
        ) : (
          <div className="package-list">
            {discountPackages.map((option, idx) => (
              <div
                key={idx}
                className={`package-card ${selectedOption?.stars === option.stars ? "selected" : ""} ${!option.slotAvailable ? "disabled" : ""}`}
                onClick={() => option.slotAvailable && handleOptionSelect(option)}
                style={{ opacity: option.slotAvailable ? 1 : 0.5, cursor: option.slotAvailable ? 'pointer' : 'not-allowed' }}
              >
                <div className="package-discount-badge">-{option.discount}%</div>
                <div className="package-stars">
                  <span className="package-star-icon">⭐</span>
                  <span className="package-star-count">{formatAmount(option.stars)}</span>
                </div>
                <div className="package-price">
                  {formatAmount(option.discountedPrice)} so'm
                </div>
                <div className="package-original-price">
                  {formatAmount(option.basePrice)} so'm
                </div>
                {!option.slotAvailable && (
                  <div className="package-unavailable">Band</div>
                )}
                {selectedOption?.stars === option.stars && option.slotAvailable && (
                  <div className="package-check">✓</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="discount-actions">
        <button 
          className={`discount-button ${!selectedOption ? "disabled" : ""}`} 
          onClick={handlePayment}
          disabled={!selectedOption}
        >
          {selectedOption 
            ? `Stars olish - ${formatAmount(selectedOption.discountedPrice)} so'm`
            : "Paketni tanlang"
          }
        </button>
      </div>

      {/* To'lov ma'lumotlari (to'liq ekran) */}
      {showModal && status === "payment_info" && order && (
        <PaymentTransfer
          cardDisplay={CARD_NUMBER}
          cardNumber={paymentCard.number}
          cardName={CARD_NAME}
          amount={order.amount}
          countdown={countdown}
          item="stars"
          onClose={() => setShowModal(false)}
          onPaid={handlePaymentDone}
        />
      )}

      {/* To'lovdan keyingi holatlar */}
      {showModal && order && toStage(status) && (
        <PaymentStatus
          stage={toStage(status)}
          item="stars"
          product={`${order.stars} Stars`}
          productName="Stars"
          badge={`${order.stars} ⭐`}
          recipient={profile?.username}
          amount={order.amount}
          countdown={countdown}
          txId={txId}
          orderId={order.id}
          autoClose={timer}
          onClose={() => setShowModal(false)}
          onDone={() => setShowModal(false)}
          onRetry={goToHome}
        />
      )}
    </div>
  );
}
