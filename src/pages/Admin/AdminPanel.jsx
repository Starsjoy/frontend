import React, { useEffect, useState } from "react";
import "./AdminPanel.css";
import { TGSSticker } from "../../components/TGSSticker";
import adminSticker from "../../assets/AnimatedSticker_admin.tgs";
import apiFetch from "../../utils/apiFetch";
import AdminCustomSelect from "../../components/AdminCustomSelect";

const PURCHASE_MODE_OPTIONS = [
  { value: "robynhood", label: "RobynHood", icon: "🔷" },
  { value: "fragment", label: "Fragment", icon: "🟣" },
  { value: "paymee", label: "Paymee", icon: "🟢" },
];

const FRAGMENT_PAY_OPTIONS = [
  { value: "ton", label: "TON", icon: "💎" },
  { value: "usdt_ton", label: "USDT", icon: "💵" },
];

const ORDER_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Hammasi", icon: "📋" },
  { value: "pending", label: "Pending", icon: "⏳" },
  { value: "completed", label: "Completed", icon: "✅" },
  { value: "expired", label: "Expired", icon: "❌" },
  { value: "stars_sent", label: "Sent", icon: "🌟" },
  { value: "failed", label: "Failed", icon: "⚠️" },
  { value: "error", label: "Error", icon: "🔴" },
];

const GIFT_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Hammasi", icon: "📋" },
  { value: "pending", label: "Pending", icon: "⏳" },
  { value: "completed", label: "Completed", icon: "✅" },
  { value: "gift_sent", label: "Sent", icon: "🎁" },
  { value: "expired", label: "Expired", icon: "❌" },
  { value: "error", label: "Error", icon: "🔴" },
];

const PREMIUM_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Hammasi", icon: "📋" },
  { value: "pending", label: "Pending", icon: "⏳" },
  { value: "delivered", label: "Sent", icon: "💎" },
  { value: "expired", label: "Expired", icon: "❌" },
  { value: "failed", label: "Failed", icon: "⚠️" },
  { value: "error", label: "Error", icon: "🔴" },
];

const isPaymeeOrder = (tx) =>
  tx?.order_type === "stars_paymee" || tx?.order_type === "premium_paymee";

const isFragmentOrder = (tx) =>
  tx?.order_type === "stars_usdt" ||
  tx?.order_type === "premium_usdt" ||
  tx?.delivery_type === "fragment";

const ADMIN_SEND_STATUSES = ["pending", "failed", "expired"];

const getOrderCardClassName = (tx) => {
  const classes = ["order-card"];
  if (isPaymeeOrder(tx)) classes.push("order-card--paymee");
  if (tx?.status === "failed") classes.push("order-card--failed");
  return classes.join(" ");
};

const getGiftStickerPath = (giftId) => {
  if (!giftId) return null;
  try {
    return new URL(`../../assets/${giftId}.tgs`, import.meta.url).href;
  } catch {
    return null;
  }
};

export default function AdminPanel() {
  // ========== TELEGRAM AUTH PROTECTION ==========
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  // Telegram user admin ekanligini tekshirish
  useEffect(() => {
    try {
      // Backend admin endpointga test so'rov yuborish
      // Development da initData bo'lmasa ham backend o'tkazadi
      apiFetch("/api/admin/users")
        .then(res => {
          if (res.ok) {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
          setAuthChecking(false);
        })
        .catch(() => {
          setIsAuthenticated(false);
          setAuthChecking(false);
        });
    } catch {
      setIsAuthenticated(false);
      setAuthChecking(false);
    }
  }, []);

  // All other state hooks - MUST be before any conditional return
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({
    totalStars: 0,
    completed: 0,
    expired: 0,
    pending: 0,
    stars_sent: 0,
    failed: 0,
    error: 0,
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // Users state
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("transactions");

  const goToTab = (tab) => {
    setActiveTab(tab);
  };

  const SECONDARY_NAV_BOTTOM = [
    { id: "analytics", icon: "📊", label: "Stat" },
    { id: "notifications", icon: "📣", label: "Xabar" },
    { id: "settings", icon: "%", label: "Cheg" },
    { id: "promocodes", icon: "➕", label: "Promo" },
    { id: "referrals", icon: "🤝", label: "Ref" },
  ];

  const SECONDARY_NAV_HEADER = [
    { id: "analytics", icon: "📊", label: "Analitika" },
    { id: "notifications", icon: "📣", label: "Xabar" },
    { id: "settings", icon: "%", label: "Chegirma" },
    { id: "promocodes", icon: "➕", label: "Promokod" },
    { id: "referrals", icon: "🤝", label: "Referral" },
  ];
  const [userStats, setUserStats] = useState({
    total: 0,
    today: 0,
    totalReferrals: 0
  });

  // New: expanded order & show all
  const [expandedId, setExpandedId] = useState(null);
  const [showAll, setShowAll] = useState(false);

  // Referral withdrawals state
  const [refWithdrawals, setRefWithdrawals] = useState([]);
  const [refFilter, setRefFilter] = useState("pending");

  // Balance adjustment state
  const [balanceModal, setBalanceModal] = useState(null); // { username, currentBalance }
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Som balance adjustment state
  const [somBalanceModal, setSomBalanceModal] = useState(null); // { username, currentBalance }
  const [somBalanceAmount, setSomBalanceAmount] = useState("");
  const [somBalanceLoading, setSomBalanceLoading] = useState(false);
  
  // User details modal state
  const [userModal, setUserModal] = useState(null); // full user object
  const [referrerInfo, setReferrerInfo] = useState(null); // referrer user info
  const [userReferrals, setUserReferrals] = useState([]); // list of users referred by this user
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [showAllReferrals, setShowAllReferrals] = useState(false);

  // User card selection & modal type
  const [selectedUserCard, setSelectedUserCard] = useState(null); // selected user for buttons
  const [userDetailsModalType, setUserDetailsModalType] = useState(null); // "info" or "referrals"

  // 🔧 Maintenance mode
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  const [starsPurchaseMode, setStarsPurchaseMode] = useState("robynhood");
  const [purchaseModeLoading, setPurchaseModeLoading] = useState(false);
  const [fragmentTokens, setFragmentTokens] = useState({
    fragment_dt: "-300",
    fragment_ssid: "",
    fragment_token: "",
    fragment_ton_token: "",
  });
  const [fragmentTokensLoading, setFragmentTokensLoading] = useState(false);
  const [fragmentVerifyLoading, setFragmentVerifyLoading] = useState(false);
  const [fragmentVerifyMsg, setFragmentVerifyMsg] = useState("");
  const [fragmentPaymentMethod, setFragmentPaymentMethod] = useState("ton");
  const [fragmentPayLoading, setFragmentPayLoading] = useState(false);
  const [fragmentEnvStatus, setFragmentEnvStatus] = useState(null);
  const [fragmentEnvLoading, setFragmentEnvLoading] = useState(false);
  const [fragmentTestSource, setFragmentTestSource] = useState("env");
  const [fragmentTestResult, setFragmentTestResult] = useState(null);
  const [fragmentTestLoading, setFragmentTestLoading] = useState(false);

  // 🔔 Notifications state
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifType, setNotifType] = useState("info");
  const [notifGlobal, setNotifGlobal] = useState(true);
  const [notifUserId, setNotifUserId] = useState("");
  const [notifSending, setNotifSending] = useState(false);
  const [notifHistory, setNotifHistory] = useState([]);

  // Premium orders state
  const [premiumOrders, setPremiumOrders] = useState([]);
  const [premiumExpandedId, setPremiumExpandedId] = useState(null);
  const [premiumFilter, setPremiumFilter] = useState("all");
  const [premiumStats, setPremiumStats] = useState({
    total: 0,
    pending: 0,
    premium_sent: 0,
    expired: 0,
    failed: 0
  });
  const [premiumShowAll, setPremiumShowAll] = useState(false);

  // Manual Premium Order state
  const [manualPremiumModal, setManualPremiumModal] = useState(null); // "1_oy" | "1_yil" | null
  const [manualPremiumUsername, setManualPremiumUsername] = useState("");
  const [manualPremiumLoading, setManualPremiumLoading] = useState(false);

  // Gift orders state
  const [giftOrders, setGiftOrders] = useState([]);
  const [giftExpandedId, setGiftExpandedId] = useState(null);
  const [giftFilter, setGiftFilter] = useState("all");
  const [giftStats, setGiftStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    gift_sent: 0,
    expired: 0,
    failed: 0
  });
  const [giftShowAll, setGiftShowAll] = useState(false);
  const [adminSendingOrderId, setAdminSendingOrderId] = useState(null);

  // Analytics state
  const [analyticsPeriod, setAnalyticsPeriod] = useState("all"); // day, week, month, all
  const [analyticsData, setAnalyticsData] = useState({
    stars: { count: 0, totalStars: 0, totalAmount: 0 },
    premium: { count: 0, totalAmount: 0 },
    gift: { count: 0, totalStars: 0, totalAmount: 0 },
    total: { count: 0, totalAmount: 0 }
  });
  const [dailyStats, setDailyStats] = useState([]); // [{date, stars, amount, count}]
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Foydalanuvchi o'sishi + bonus missiya analitikasi (backendda SQL bilan hisoblanadi)
  const [growth, setGrowth] = useState(null);
  const [growthLoading, setGrowthLoading] = useState(false);

  // Wallet & Prices state
  const [walletBalance, setWalletBalance] = useState({ mainnet: 0, testnet: 0 });
  const [starPrices, setStarPrices] = useState({ priceFor50: 0, pricePerStar: 0, currency: "TON", availableStars: 0 });
  const [walletLoading, setWalletLoading] = useState(false);
  const [botStarsBalance, setBotStarsBalance] = useState(0);
  const [userbotRefillEnabled, setUserbotRefillEnabled] = useState(true);
  const [userbotRefillMin, setUserbotRefillMin] = useState(200);
  const [userbotRefillStars, setUserbotRefillStars] = useState(50);
  const [userbotRefillUsername, setUserbotRefillUsername] = useState("StarsjoySupport");
  const [userbotRefillToggleLoading, setUserbotRefillToggleLoading] = useState(false);
  const [paymeeWallet, setPaymeeWallet] = useState({
    configured: false,
    balanceUsdt: null,
    currency: "USDT",
    usdtPerStar: null,
    availableStars: null,
    error: null,
  });
  const [headerPaymeeLoading, setHeaderPaymeeLoading] = useState(false);

  // Discount packages state
  const [discountPackages, setDiscountPackages] = useState([]);
  const [newPackage, setNewPackage] = useState({ stars: "", discount_percent: "" });
  const [packageLoading, setPackageLoading] = useState(false);

  // Promocodes state
  const [promocodes, setPromocodes] = useState([]);
  const [promoForm, setPromoForm] = useState({ code: '', target_type: 'stars', target_amount: '', discount_percent: 10, usage_limit: 10 });
  const [promoLoading, setPromoLoading] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const BASE_PRICE = parseInt(import.meta.env.VITE_NARX) || 240;

  // Referral requests state
  const [referralRequests, setReferralRequests] = useState([]);
  const [referralFilter, setReferralFilter] = useState("pending");
  const [referralLoading, setReferralLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState(null);

  const applySettingsFromApi = (data) => {
    if (!data) return;
    if (data.maintenance !== undefined) setMaintenanceMode(Boolean(data.maintenance));
    if (data.stars_purchase_mode) setStarsPurchaseMode(data.stars_purchase_mode);
    if (data.fragment_payment_method) setFragmentPaymentMethod(data.fragment_payment_method);
  };

  const fetchAdminSettings = async () => {
    try {
      const res = await apiFetch("/api/admin/settings");
      const data = await res.json();
      if (res.ok) applySettingsFromApi(data);
    } catch (err) {
      console.error("Admin settings yuklash:", err);
    }
  };

  // ========== SOZLAMALAR (settings jadvali — DB) ==========
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchAdminSettings();
    fetchReferralRequests("all");
  }, [isAuthenticated]);

  const toggleMaintenance = async () => {
    setMaintenanceLoading(true);
    try {
      const res = await apiFetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !maintenanceMode }),
      });
      const data = await res.json();
      if (res.ok) applySettingsFromApi(data);
    } catch (err) {
      console.error("Maintenance toggle xato:", err);
    }
    setMaintenanceLoading(false);
  };

  // ========== WALLET & PRICES FUNCTION ==========
  const fetchWalletAndPrices = async () => {
    setWalletLoading(true);
    try {
      // Parallel fetch wallet info and bot stars balance
      const [walletRes, botStarsRes, refillStatusRes] = await Promise.all([
        apiFetch("/api/admin/wallet-info"),
        apiFetch("/api/admin/bot-stars-balance"),
        apiFetch("/api/admin/userbot-refill/status"),
      ]);
      
      const data = await walletRes.json();

      if (data.success) {
        setWalletBalance({
          mainnet: data.wallet.mainnet_balance || 0,
          testnet: data.wallet.testnet_balance || 0
        });

        setStarPrices({
          priceFor50: data.stars_price.price_for_50 || 0,
          pricePerStar: data.stars_price.price_per_star || 0,
          currency: data.stars_price.currency || "TON",
          availableStars: data.available_stars || 0
        });

        const pm = data.paymee;
        if (pm?.configured && pm.balance_usdt != null && !Number.isNaN(Number(pm.balance_usdt))) {
          setPaymeeWallet({
            configured: true,
            balanceUsdt: Number(pm.balance_usdt),
            currency: pm.currency || "USDT",
            usdtPerStar: pm.usdt_per_star != null ? Number(pm.usdt_per_star) : null,
            availableStars:
              pm.available_stars != null
                ? Number(pm.available_stars)
                : data.available_stars ?? null,
            error: null,
          });
        } else if (pm?.configured) {
          setPaymeeWallet({
            configured: true,
            balanceUsdt: null,
            currency: "USDT",
            usdtPerStar: null,
            availableStars: null,
            error: pm.error || "Balans olinmadi",
          });
        } else {
          setPaymeeWallet({
            configured: false,
            balanceUsdt: null,
            currency: "USDT",
            usdtPerStar: null,
            availableStars: null,
            error: null,
          });
        }
      }

      // Bot stars balance
      const botStarsData = await botStarsRes.json();
      console.log("🤖 Bot stars response:", botStarsData);
      if (botStarsData.success) {
        setBotStarsBalance(botStarsData.bot_stars_balance || 0);
        console.log("✅ Bot stars balance set:", botStarsData.bot_stars_balance);
      } else {
        console.warn("⚠️ Bot stars fetch muvaffaqiyatsiz:", botStarsData.message || botStarsData.error);
        setBotStarsBalance(0);
      }

      const refillStatus = await refillStatusRes.json();
      if (refillStatus.success) {
        setUserbotRefillEnabled(Boolean(refillStatus.enabled));
        if (refillStatus.min_balance != null) setUserbotRefillMin(refillStatus.min_balance);
        if (refillStatus.refill_stars != null) setUserbotRefillStars(refillStatus.refill_stars);
        if (refillStatus.refill_username) setUserbotRefillUsername(refillStatus.refill_username);
        if (refillStatus.bot_stars_balance != null) {
          setBotStarsBalance(refillStatus.bot_stars_balance);
        }
      }
    } catch (err) {
      console.error("❌ Wallet/Prices fetch error:", err);
    } finally {
      setWalletLoading(false);
    }
  };

  // Get star price (per star)
  const getStarPrice = () => {
    return starPrices?.pricePerStar || 0;
  };

  // Get available stars (pre-calculated from backend)
  const getAvailableStars = () => {
    return starPrices?.availableStars || 0;
  };

  const fetchHeaderPaymeeBalance = async () => {
    setHeaderPaymeeLoading(true);
    try {
      const res = await apiFetch("/api/admin/paymee/status");
      const data = await res.json();
      if (data.configured && data.balance?.balance_usdt != null) {
        setPaymeeWallet((prev) => ({
          ...prev,
          configured: true,
          balanceUsdt: Number(data.balance.balance_usdt),
          currency: data.balance.currency || "USDT",
          error: null,
        }));
      } else if (data.configured) {
        setPaymeeWallet((prev) => ({
          ...prev,
          configured: true,
          balanceUsdt: null,
          error: data.balance?.error || "Balans olinmadi",
        }));
      } else {
        setPaymeeWallet((prev) => ({
          ...prev,
          configured: false,
          balanceUsdt: null,
          error: data.error || null,
        }));
      }
    } catch (err) {
      console.error("Header Paymee balance:", err);
      setPaymeeWallet((prev) => ({
        ...prev,
        error: "Balans yuklanmadi",
      }));
    } finally {
      setHeaderPaymeeLoading(false);
    }
  };

  const formatHeaderPaymeeBalance = () => {
    if (headerPaymeeLoading) return "…";
    if (!paymeeWallet.configured) return "—";
    if (paymeeWallet.error) return "!";
    if (paymeeWallet.balanceUsdt == null || Number.isNaN(paymeeWallet.balanceUsdt)) return "—";
    return `$${Number(paymeeWallet.balanceUsdt).toFixed(1)}`;
  };

  const toggleUserbotRefill = async () => {
    setUserbotRefillToggleLoading(true);
    try {
      const res = await apiFetch("/api/admin/userbot-refill/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !userbotRefillEnabled }),
      });
      const data = await res.json();
      if (data.success) {
        setUserbotRefillEnabled(Boolean(data.enabled));
        if (data.bot_stars_balance != null) setBotStarsBalance(data.bot_stars_balance);
      }
    } catch (err) {
      console.error("Userbot refill toggle:", err);
    } finally {
      setUserbotRefillToggleLoading(false);
    }
  };

  // Header Paymee balansi
  useEffect(() => {
    if (isAuthenticated) {
      fetchHeaderPaymeeBalance();
    }
  }, [isAuthenticated]);

  // Fetch wallet when analytics tab is active
  useEffect(() => {
    if (activeTab === "analytics" && isAuthenticated) {
      fetchWalletAndPrices();
      fetchGrowth();
    }
  }, [activeTab, isAuthenticated]);

  // ========== FOYDALANUVCHI O'SISHI + BONUS ANALITIKASI ==========
  const fetchGrowth = async () => {
    if (!isAuthenticated) return;
    setGrowthLoading(true);
    try {
      const res = await apiFetch("/api/admin/analytics/overview?days=30");
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || "analytics error");
      setGrowth(d);
    } catch (err) {
      console.error("❌ Growth analytics error:", err);
      setGrowth(null);
    } finally {
      setGrowthLoading(false);
    }
  };

  // ========== ANALYTICS FUNCTION ==========
  const fetchAnalytics = async () => {
    if (!isAuthenticated) return;
    setAnalyticsLoading(true);
    try {
      // Get date range based on period
      const now = new Date();
      let startDate = null;
      
      if (analyticsPeriod === "day") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (analyticsPeriod === "week") {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (analyticsPeriod === "month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      // Fetch all data
      const [starsRes, premiumRes, giftRes] = await Promise.all([
        apiFetch("/api/transactions/all"),
        apiFetch("/api/admin/premium/list"),
        apiFetch("/api/admin/gift/list")
      ]);

      const starsData = await starsRes.json();
      const premiumJson = await premiumRes.json();
      const giftJson = await giftRes.json();

      // Extract arrays (stars is direct array, premium/gift have .orders)
      const premiumData = premiumJson.orders || [];
      const giftData = giftJson.orders || [];

      // Filter by date and completed status (stars_sent, premium_sent, gift_sent, completed)
      const filterByDate = (items, dateField = "created_at") => {
        if (!startDate) return items;
        return items.filter(item => new Date(item[dateField]) >= startDate);
      };

      // Stars: stars_sent yoki completed
      const filteredStars = filterByDate(starsData).filter(tx => 
        tx.status === "stars_sent" || tx.status === "completed"
      );
      // Premium: premium_sent, completed yoki delivered
      const filteredPremium = filterByDate(premiumData).filter(tx => 
        tx.status === "premium_sent" || tx.status === "completed" || tx.status === "delivered"
      );
      // Gift: gift_sent yoki completed
      const filteredGift = filterByDate(giftData).filter(tx => 
        tx.status === "gift_sent" || tx.status === "completed"
      );

      // Calculate analytics
      const starsStats = {
        count: filteredStars.length,
        totalStars: filteredStars.reduce((sum, tx) => sum + (tx.stars || 0), 0),
        totalAmount: filteredStars.reduce((sum, tx) => sum + (tx.amount || 0), 0)
      };

      const premiumStats = {
        count: filteredPremium.length,
        totalAmount: filteredPremium.reduce((sum, tx) => sum + (tx.amount || 0), 0)
      };

      const giftStats = {
        count: filteredGift.length,
        totalStars: filteredGift.reduce((sum, tx) => sum + (tx.stars || 0), 0),
        totalAmount: filteredGift.reduce((sum, tx) => sum + (tx.amount || 0), 0)
      };

      setAnalyticsData({
        stars: starsStats,
        premium: premiumStats,
        gift: giftStats,
        total: {
          count: starsStats.count + premiumStats.count + giftStats.count,
          totalAmount: starsStats.totalAmount + premiumStats.totalAmount + giftStats.totalAmount
        }
      });

      // Calculate daily breakdown from all completed transactions
      const successStatuses = ["stars_sent", "premium_sent", "gift_sent", "completed", "delivered", "accepted"];
      const completedStars = starsData.filter(tx => successStatuses.includes(tx.status));
      const completedPremium = premiumData.filter(tx => successStatuses.includes(tx.status));
      const completedGift = giftData.filter(tx => successStatuses.includes(tx.status));
      
      const allCompleted = [...completedStars, ...completedPremium, ...completedGift];
      
      const dailyMap = {};
      const today = new Date();
      today.setHours(23,59,59,999);
      
      let oldestDate = new Date();
      if (allCompleted.length > 0) {
        oldestDate = new Date(Math.min(...allCompleted.map(tx => new Date(tx.created_at).getTime())));
      } else {
        // Default to a month ago if no data
        oldestDate.setMonth(oldestDate.getMonth() - 1);
      }
      oldestDate.setHours(0,0,0,0);

      // Generate daily keys from oldestDate to today
      const curr = new Date(oldestDate);
      while (curr <= today) {
        const key = curr.toISOString().split('T')[0];
        dailyMap[key] = { 
          date: key, 
          amount: 0, 
          count: 0,
          stars: 0, 
          stars_amount: 0,
          stars_count: 0,
          premium_amount: 0,
          premium_count: 0,
          gift_amount: 0,
          gift_count: 0
        };
        curr.setDate(curr.getDate() + 1);
      }

      // Aggregate all transactions by day
      const aggregateToDaily = (transactions, category) => {
        transactions.forEach(tx => {
          const txDate = new Date(tx.created_at).toISOString().split('T')[0];
          if (dailyMap[txDate]) {
            dailyMap[txDate].amount += tx.amount || 0;
            dailyMap[txDate].count += 1;
            
            if (category === "stars") {
              dailyMap[txDate].stars += tx.stars || 0;
              dailyMap[txDate].stars_amount += tx.amount || 0;
              dailyMap[txDate].stars_count += 1;
            } else if (category === "premium") {
              dailyMap[txDate].premium_amount += tx.amount || 0;
              dailyMap[txDate].premium_count += 1;
            } else if (category === "gift") {
              dailyMap[txDate].gift_amount += tx.amount || 0;
              dailyMap[txDate].gift_count += 1;
            }
          }
        });
      };

      aggregateToDaily(completedStars, "stars");
      aggregateToDaily(completedPremium, "premium");
      aggregateToDaily(completedGift, "gift");

      setDailyStats(Object.values(dailyMap));
    } catch (err) {
      console.error("❌ Analytics fetch error:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Fetch analytics when period changes
  useEffect(() => {
    if (activeTab === "analytics" && isAuthenticated) {
      fetchAnalytics();
    }
  }, [analyticsPeriod, activeTab, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && activeTab === "settings") {
      fetchFragmentTokens();
    }
  }, [isAuthenticated, activeTab]);

  const fetchFragmentTokens = async () => {
    setFragmentTokensLoading(true);
    try {
      const res = await apiFetch("/api/admin/tokens/fragment?masked=0");
      const data = await res.json();
      if (data.tokens) setFragmentTokens(data.tokens);
    } catch (err) {
      console.error("Fragment tokens:", err);
    } finally {
      setFragmentTokensLoading(false);
    }
  };

  const saveFragmentTokens = async () => {
    setFragmentTokensLoading(true);
    try {
      const res = await apiFetch("/api/admin/tokens/fragment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fragmentTokens),
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ Fragment cookie saqlandi");
        if (data.tokens) setFragmentTokens(data.tokens);
      } else {
        alert("❌ " + (data.error || "Xato"));
      }
    } catch {
      alert("Server xatosi");
    } finally {
      setFragmentTokensLoading(false);
    }
  };

  const fetchFragmentEnvStatus = async () => {
    setFragmentEnvLoading(true);
    try {
      const res = await apiFetch("/api/admin/fragment/env-status");
      const data = await res.json();
      if (res.ok) setFragmentEnvStatus(data);
    } catch (err) {
      console.error("Fragment env-status:", err);
    } finally {
      setFragmentEnvLoading(false);
    }
  };

  const runFragmentCookieTest = async () => {
    setFragmentTestLoading(true);
    setFragmentTestResult(null);
    try {
      const res = await apiFetch(
        `/api/admin/fragment/cookie-test?source=${encodeURIComponent(fragmentTestSource)}`
      );
      const data = await res.json();
      setFragmentTestResult(data);
    } catch (err) {
      setFragmentTestResult({ ok: false, error: err.message || "Tekshiruv xatosi" });
    } finally {
      setFragmentTestLoading(false);
    }
  };

  const verifyFragmentCookies = async () => {
    setFragmentVerifyLoading(true);
    setFragmentVerifyMsg("");
    try {
      const res = await apiFetch("/api/admin/fragment/verify");
      const data = await res.json();
      setFragmentVerifyMsg(data.ok ? "✅ Cookie ishlayapti" : `❌ ${data.error || "Xato"}`);
    } catch {
      setFragmentVerifyMsg("❌ Tekshiruv xatosi");
    } finally {
      setFragmentVerifyLoading(false);
    }
  };

  const setFragmentPayMethod = async (method) => {
    if (method === fragmentPaymentMethod || fragmentPayLoading) return;
    setFragmentPayLoading(true);
    try {
      const res = await apiFetch("/api/admin/fragment-payment-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_method: method }),
      });
      const data = await res.json();
      if (res.ok) applySettingsFromApi(data);
      else alert(data.error || "Xato");
    } catch {
      alert("Server xatosi");
    } finally {
      setFragmentPayLoading(false);
    }
  };

  const setPurchaseMode = async (mode) => {
    if (mode === starsPurchaseMode || purchaseModeLoading) return;
    setPurchaseModeLoading(true);
    try {
      const res = await apiFetch("/api/admin/stars-purchase-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (res.ok) applySettingsFromApi(data);
      else alert(data.error || "Xato");
    } catch {
      alert("Server xatosi");
    } finally {
      setPurchaseModeLoading(false);
    }
  };

  // ========== ALL FUNCTIONS ==========
  const fetchTransactions = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      let url = "/api/transactions/all";
      if (filter !== "all") {
        url = `/api/transactions/status/${filter}`;
      }

      const res = await apiFetch(url);
      const data = await res.json();
      setTransactions(data);

      const stat = {
        totalStars: 0,
        completed: 0,
        expired: 0,
        pending: 0,
        stars_sent: 0,
        failed: 0,
        error: 0,
      };

      data.forEach((tx) => {
        stat.totalStars += tx.stars;
        if (stat[tx.status] !== undefined) stat[tx.status]++;
      });

      setStats(stat);
    } catch (err) {
      console.error("❌ Transactionlarni olishda xato:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/users");
      const data = await res.json();
      setUsers(data);

      const todayStr = new Date().toDateString();
      const stats = {
        total: data.length,
        today: data.filter(u => new Date(u.created_at).toDateString() === todayStr).length,
        totalReferrals: data.reduce((acc, u) => acc + (u.total_referrals || 0), 0)
      };
      setUserStats(stats);
    } catch (err) {
      console.error("❌ Users fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPremiumOrders = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/premium/list?status=${premiumFilter}`);
      const data = await res.json();
      
      if (data.success) {
        setPremiumOrders(data.orders || []);
        
        // Calculate stats from all orders
        const allRes = await apiFetch("/api/admin/premium/list?status=all");
        const allData = await allRes.json();
        
        if (allData.success) {
          const orders = allData.orders || [];
          const stats = {
            total: orders.length,
            pending: orders.filter(o => o.status === 'pending').length,
            delivered: orders.filter(o => o.status === 'delivered' || o.status === 'premium_sent').length,
            expired: orders.filter(o => o.status === 'expired').length,
            failed: orders.filter(o => o.status === 'failed' || o.status === 'error').length
          };
          setPremiumStats(stats);
        }
      }
    } catch (err) {
      console.error("❌ Premium orders fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRefWithdrawals = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/referral-withdrawals?status=${refFilter}`);
      const data = await res.json();
      setRefWithdrawals(data);
    } catch (err) {
      console.error("❌ Referral withdrawals fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGiftOrders = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/gift/list?status=${giftFilter}`);
      const data = await res.json();

      if (data.success) {
        setGiftOrders(data.orders || []);

        // Calculate stats from all orders
        const allRes = await apiFetch("/api/admin/gift/list?status=all");
        const allData = await allRes.json();

        if (allData.success) {
          const orders = allData.orders || [];
          const stats = {
            total: orders.length,
            pending: orders.filter(o => o.status === 'pending').length,
            completed: orders.filter(o => o.status === 'completed').length,
            gift_sent: orders.filter(o => o.status === 'gift_sent').length,
            expired: orders.filter(o => o.status === 'expired').length,
            failed: orders.filter(o => o.status === 'failed' || o.status === 'error').length
          };
          setGiftStats(stats);
        }
      }
    } catch (err) {
      console.error("❌ Gift orders fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Discount packages fetch
  const fetchDiscountPackages = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/discount-packages");
      const data = await res.json();
      setDiscountPackages(data);
    } catch (err) {
      console.error("❌ Discount packages fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate discounted price
  const calculateDiscountedPrice = (stars, discountPercent) => {
    if (!stars || !discountPercent) return 0;
    const normalPrice = parseInt(stars) * BASE_PRICE;
    const discount = (normalPrice * parseInt(discountPercent)) / 100;
    return Math.round(normalPrice - discount);
  };

  // Add new discount package
  const addDiscountPackage = async () => {
    if (!newPackage.stars || !newPackage.discount_percent) {
      alert("Stars va chegirma foizini kiriting!");
      return;
    }

    const discountedPrice = calculateDiscountedPrice(newPackage.stars, newPackage.discount_percent);
    
    setPackageLoading(true);
    try {
      const res = await apiFetch("/api/admin/discount-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stars: parseInt(newPackage.stars),
          discount_percent: parseInt(newPackage.discount_percent),
          discounted_price: discountedPrice
        })
      });

      if (res.ok) {
        setNewPackage({ stars: "", discount_percent: "" });
        fetchDiscountPackages();
      } else {
        alert("Xato yuz berdi!");
      }
    } catch (err) {
      console.error("❌ Add package error:", err);
      alert("Xato yuz berdi!");
    } finally {
      setPackageLoading(false);
    }
  };

  // Delete discount package
  const deleteDiscountPackage = async (id) => {
    if (!confirm("Rostdan o'chirmoqchimisiz?")) return;
    
    try {
      const res = await apiFetch(`/api/admin/discount-packages/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        fetchDiscountPackages();
      } else {
        alert("O'chirishda xato!");
      }
    } catch (err) {
      console.error("❌ Delete package error:", err);
    }
  };

  // Toggle package active status
  const togglePackageActive = async (id, currentStatus) => {
    try {
      const res = await apiFetch(`/api/admin/discount-packages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (res.ok) {
        fetchDiscountPackages();
      }
    } catch (err) {
      console.error("❌ Toggle package error:", err);
    }
  };

  // Fetch referral requests
  const fetchReferralRequests = async (filter = "pending") => {
    setReferralLoading(true);
    try {
      const res = await apiFetch(`/api/admin/referral-requests?filter=${filter}`);
      const data = await res.json();
      setReferralRequests(data);
    } catch (err) {
      console.error("❌ Fetch referral requests error:", err);
    } finally {
      setReferralLoading(false);
    }
  };

  // Approve referral request
  const approveReferral = async (id) => {
    try {
      const res = await apiFetch(`/api/admin/referral-requests/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
      });

      if (res.ok) {
        alert("✅ Referral tasdiqlandi!");
        fetchReferralRequests(referralFilter);
      } else {
        alert("❌ Xato yuz berdi!");
      }
    } catch (err) {
      console.error("❌ Approve error:", err);
      alert("❌ Xato yuz berdi!");
    }
  };

  // Reject referral request
  const rejectReferral = async (id) => {
    if (!window.confirm("Bu referralni rad qilasizmi?")) return;

    try {
      const res = await apiFetch(`/api/admin/referral-requests/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Admin tomonidan rad etildi" })
      });

      if (res.ok) {
        alert("✅ Referral rad etildi!");
        fetchReferralRequests(referralFilter);
      } else {
        alert("❌ Xato yuz berdi!");
      }
    } catch (err) {
      console.error("❌ Reject error:", err);
      alert("❌ Xato yuz berdi!");
    }
  };

  const handlePasswordSubmit = null; // deprecated - Telegram auth ishlatiladi

  // 🔔 Fetch notification history
  const fetchNotifications = async () => {
    try {
      const res = await apiFetch("/api/admin/notifications");
      const data = await res.json();
      if (data.success) {
        setNotifHistory(data.notifications || []);
      }
    } catch (err) {
      console.error("Fetch notifications error:", err);
    }
  };

  // 🔔 Send notification
  const sendNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      alert("❌ Sarlavha va xabar kerak!");
      return;
    }
    if (!notifGlobal && !notifUserId.trim()) {
      alert("❌ User ID kiriting yoki global tanlang!");
      return;
    }

    setNotifSending(true);
    try {
      const res = await apiFetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: notifTitle.trim(),
          message: notifMessage.trim(),
          type: notifType,
          is_global: notifGlobal,
          user_id: notifGlobal ? null : notifUserId.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`✅ Notification yuborildi! (${data.type === 'global' ? 'Barchaga' : 'Shaxsiy'})`);
        setNotifTitle("");
        setNotifMessage("");
        setNotifUserId("");
        fetchNotifications();
      } else {
        alert("❌ Xato: " + data.error);
      }
    } catch (err) {
      console.error("Send notification error:", err);
      alert("❌ Server xato!");
    } finally {
      setNotifSending(false);
    }
  };

  // 🔔 Delete notification
  const deleteNotification = async (id) => {
    if (!window.confirm("Bu notificationni o'chirasizmi?")) return;
    try {
      await apiFetch(`/api/admin/notifications/${id}`, { method: "DELETE" });
      fetchNotifications();
    } catch (err) {
      console.error("Delete notification error:", err);
    }
  };

  // 🎟 Fetch Promocodes
  const fetchPromocodes = async () => {
    setPromoLoading(true);
    try {
      const res = await apiFetch("/api/admin/promocodes");
      const data = await res.json();
      if (res.ok) setPromocodes(data);
    } catch (err) {
      console.error("Fetch promocodes error:", err);
    } finally {
      setPromoLoading(false);
    }
  };

  // 🎟 Create Promocode
  const handleCreatePromo = async (e) => {
    e.preventDefault();
    if (!promoForm.code || !promoForm.discount_percent || !promoForm.usage_limit) {
      alert("Iltimos, barcha maydonlarni to'ldiring!");
      return;
    }
    try {
      const res = await apiFetch("/api/admin/promocodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promoForm)
      });
      const data = await res.json();
      if (res.ok) {
        alert("Pramakod yaratildi!");
        setPromoForm({ code: '', target_type: 'stars', target_amount: '', discount_percent: 10, usage_limit: 10 });
        fetchPromocodes();
      } else {
        alert("Xato: " + (data.error || "Noma'lum xato"));
      }
    } catch (err) {
      console.error("Create promo error", err);
      alert("Server xatosi");
    }
  };

  // 🎟 Toggle Promocode Status
  const handleTogglePromo = async (code, isActive) => {
    try {
      await apiFetch(`/api/admin/promocodes/${code}/toggle`, {
        method: "PUT"
      });
      fetchPromocodes();
    } catch (err) {
      console.error("Toggle promo error", err);
    }
  };

  // 🎟 Delete Promocode
  const handleDeletePromo = async (code) => {
    if (!window.confirm("Bu pramakodni o'chirasizmi?")) return;
    try {
      await apiFetch(`/api/admin/promocodes/${code}`, { method: "DELETE" });
      fetchPromocodes();
    } catch (err) {
      console.error("Delete promo error", err);
    }
  };

  // ========== ALL useEffect HOOKS ==========
  // Fetch data based on active tab
  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === "transactions") {
      fetchTransactions();
    } else if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "premium") {
      fetchPremiumOrders();
    } else if (activeTab === "gift") {
      fetchGiftOrders();
    } else if (activeTab === "settings") {
      fetchDiscountPackages();
    } else if (activeTab === "referrals") {
      fetchReferralRequests("pending");
    } else if (activeTab === "notifications") {
      fetchNotifications();
    } else if (activeTab === "promocodes") {
      fetchPromocodes();
    }
  }, [filter, activeTab, isAuthenticated, premiumFilter, giftFilter, referralFilter]);

  // Auto refresh - disabled
  useEffect(() => {
    if (!isAuthenticated) return;
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        if (activeTab === "transactions") fetchTransactions();
        else if (activeTab === "users") fetchUsers();
        else if (activeTab === "premium") fetchPremiumOrders();
        else if (activeTab === "gift") fetchGiftOrders();
      }, 30000); // 30 seconds instead of 5
    }
    return () => clearInterval(interval);
  }, [autoRefresh, filter, activeTab, isAuthenticated]);

  // ========== AUTH CHECK SCREEN ==========
  if (authChecking) {
    return (
      <div className="admin-password-screen">
        <div className="admin-password-box">
          <div className="admin-sticker-container">
            <TGSSticker stickerPath={adminSticker} className="admin-sticker" />
          </div>
          <h2>🔐 Admin Panel</h2>
          <p>Autentifikatsiya tekshirilmoqda...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-password-screen">
        <div className="admin-password-box">
          <div className="admin-sticker-container">
            <TGSSticker stickerPath={adminSticker} className="admin-sticker" />
          </div>
          <h2>🚫 Ruxsat berilmagan</h2>
          <p>Sizda admin huquqi yo'q</p>
        </div>
      </div>
    );
  }
  // ========== END AUTH PROTECTION ==========

  const updateStatus = async (id, newStatus) => {
    try {
      const res = await apiFetch(`/api/transactions/update/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (data.success) {
        fetchTransactions();
        setExpandedId(null);
      }
    } catch (err) {
      console.error("❌ Status update xato:", err);
    }
  };

  // Premium order expire
  const expirePremiumOrder = async (id) => {
    try {
      if (!window.confirm("❌ Bu premium buyurtmani expired qilasizmi?")) return;

      const res = await apiFetch(`/api/admin/premium/update/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "expired" }),
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ Premium order expired qilindi!");
        fetchPremiumOrders();
        setPremiumExpandedId(null);
      } else {
        alert("❌ Xato: " + data.error);
      }
    } catch (err) {
      console.error("❌ Premium expire error:", err);
      alert("Server xato!");
    }
  };

  const executeSendPremium = async (id) => {
    setAdminSendingOrderId(id);
    try {
      const res = await apiFetch(`/api/admin/premium/resend/${id}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("💎 Premium yuborildi!");
        fetchPremiumOrders();
        setPremiumExpandedId(null);
      } else {
        alert("❌ Xato: " + data.error);
      }
    } finally {
      setAdminSendingOrderId(null);
    }
  };

  const premiumSendConfirmMessage = (status) => {
    if (status === "expired") return "⏱️ Expired premium buyurtmani mijozga yuborasizmi?";
    if (status === "failed") return "⚠️ Failed premium buyurtmani mijozga yuborasizmi?";
    if (status === "pending") return "💎 Pending premium buyurtmani mijozga yuborasizmi?";
    if (status === "error" || status === "processing") {
      return "💎 Ushbu premium buyurtmani mijozga yuborasizmi?";
    }
    return "💎 Ushbu premium buyurtmani mijozga yuborasizmi?";
  };

  const premiumCanAdminSend = (status) =>
    ADMIN_SEND_STATUSES.includes(status) || status === "error" || status === "processing";

  const adminSendPremium = async (id, status) => {
    if (adminSendingOrderId !== null) return;
    try {
      if (!window.confirm(premiumSendConfirmMessage(status))) return;
      await executeSendPremium(id);
    } catch (err) {
      console.error("❌ Premium yuborishda xato:", err);
      alert("Server xato!");
      setAdminSendingOrderId(null);
    }
  };

  // Manual Premium Order yaratish (admin qo'lda akkauntga kirib yuborgan uchun)
  const closeManualPremiumModal = () => {
    setManualPremiumModal(null);
    setManualPremiumUsername("");
  };

  const openManualPremiumModal = (plan) => {
    setManualPremiumUsername("");
    setManualPremiumModal(plan);
  };

  const createManualPremiumOrder = async () => {
    if (!manualPremiumUsername.trim()) {
      alert("❌ Username kiriting!");
      return;
    }
    
    setManualPremiumLoading(true);
    try {
      const res = await apiFetch("/api/admin/premium/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_username: manualPremiumUsername.trim(),
          plan: manualPremiumModal // "1_oy" yoki "1_yil"
        }),
      });

      const data = await res.json();

      if (data.success) {
        const planText = manualPremiumModal === "1_oy" ? "1 oylik" : "1 yillik";
        alert(`✅ ${planText} Premium order yaratildi! Order #${data.order.id}`);
        closeManualPremiumModal();
        fetchPremiumOrders();
      } else {
        alert("❌ Xato: " + data.error);
      }
    } catch (err) {
      console.error("❌ Manual premium order xato:", err);
      alert("Server xato!");
    } finally {
      setManualPremiumLoading(false);
    }
  };

  // Premium order update status
  const updatePremiumStatus = async (id, newStatus) => {
    try {
      const res = await apiFetch(`/api/admin/premium/update/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (data.success) {
        fetchPremiumOrders();
        setPremiumExpandedId(null);
      }
    } catch (err) {
      console.error("❌ Premium status update xato:", err);
    }
  };

  const executeSendStars = async (id) => {
    setAdminSendingOrderId(id);
    try {
      const res = await apiFetch(`/api/admin/stars/send/${id}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("🌟 Stars yuborildi!");
        fetchTransactions();
        setExpandedId(null);
      } else {
        alert("❌ Xato: " + data.error);
      }
    } finally {
      setAdminSendingOrderId(null);
    }
  };

  const starsSendConfirmMessage = (status) => {
    if (status === "expired") return "⏱️ Expired buyurtmani mijozga yuborasizmi?";
    if (status === "failed") return "⚠️ Failed buyurtmani mijozga yuborasizmi?";
    if (status === "pending") return "⭐ Pending buyurtmani mijozga yuborasizmi?";
    return "⭐ Ushbu buyurtmani mijozga yuborasizmi?";
  };

  const starsCanAdminSend = (status) =>
    ADMIN_SEND_STATUSES.includes(status) || status === "error" || status === "processing";

  const adminSendStars = async (id, status) => {
    if (adminSendingOrderId !== null) return;
    try {
      if (!window.confirm(starsSendConfirmMessage(status))) return;
      await executeSendStars(id);
    } catch (err) {
      console.error("❌ Stars yuborishda xato:", err);
      alert("Server xato!");
      setAdminSendingOrderId(null);
    }
  };

  // Gift order expire
  const expireGiftOrder = async (id) => {
    try {
      if (!window.confirm("❌ Bu gift buyurtmani expired qilasizmi?")) return;

      const res = await apiFetch(`/api/admin/gift/update/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "expired" }),
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ Gift order expired qilindi!");
        fetchGiftOrders();
        setGiftExpandedId(null);
      } else {
        alert("❌ Xato: " + data.error);
      }
    } catch (err) {
      console.error("❌ Gift expire error:", err);
      alert("Server xato!");
    }
  };

  const executeSendGift = async (id) => {
    setAdminSendingOrderId(id);
    try {
      const res = await apiFetch(`/api/admin/gift/send/${id}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("🎁 Gift yuborildi!");
        fetchGiftOrders();
        setGiftExpandedId(null);
      } else {
        alert("❌ Xato: " + data.error);
      }
    } finally {
      setAdminSendingOrderId(null);
    }
  };

  const giftSendConfirmMessage = (status) => {
    if (status === "expired") return "⏱️ Expired gift buyurtmani mijozga yuborasizmi?";
    if (status === "failed") return "⚠️ Failed gift buyurtmani mijozga yuborasizmi?";
    if (status === "pending") return "🎁 Pending gift buyurtmani mijozga yuborasizmi?";
    return "🎁 Ushbu gift buyurtmani mijozga yuborasizmi?";
  };

  const giftCanAdminSend = (status) =>
    ADMIN_SEND_STATUSES.includes(status) || status === "error" || status === "processing";

  const adminSendGift = async (id, status) => {
    if (adminSendingOrderId !== null) return;
    try {
      if (!window.confirm(giftSendConfirmMessage(status))) return;
      await executeSendGift(id);
    } catch (err) {
      console.error("❌ Gift yuborishda xato:", err);
      alert("Server xato!");
      setAdminSendingOrderId(null);
    }
  };

  const renderAdminSendButton = (orderId, onSend) => {
    const sending = adminSendingOrderId === orderId;
    const busy = adminSendingOrderId !== null;
    return (
      <button
        type="button"
        className={`action-btn send${sending ? " action-btn--sending" : ""}`}
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          if (busy) return;
          onSend();
        }}
      >
        {sending ? (
          <span className="action-btn-send-inner">
            <span className="action-btn-spinner" aria-hidden="true" />
            Yuborilmoqda...
          </span>
        ) : (
          "📤 Yuborish"
        )}
      </button>
    );
  };

  // Gift order update status
  const updateGiftStatus = async (id, newStatus) => {
    try {
      const res = await apiFetch(`/api/admin/gift/update/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (data.success) {
        fetchGiftOrders();
        setGiftExpandedId(null);
      }
    } catch (err) {
      console.error("❌ Gift status update xato:", err);
    }
  };

  // Referral withdrawal approve
  const approveWithdrawal = async (id) => {
    try {
      if (!window.confirm("✅ Bu so'rovni tasdiqlaysizmi? (Stars yuborildi deb belgilanadi)")) return;

      const res = await apiFetch(`/api/admin/referral-withdrawals/${id}/approve`, {
        method: "POST",
      });

      const data = await res.json();
      if (data.success) {
        alert("✅ Tasdiqlandi!");
        fetchRefWithdrawals();
      } else {
        alert("❌ Xato: " + data.error);
      }
    } catch (err) {
      console.error("❌ Approve error:", err);
      alert("Server xato!");
    }
  };

  // Referral withdrawal reject
  const rejectWithdrawal = async (id) => {
    try {
      if (!window.confirm("❌ Bu so'rovni bekor qilasizmi? (Balans qaytariladi)")) return;

      const res = await apiFetch(`/api/admin/referral-withdrawals/${id}/reject`, {
        method: "POST",
      });

      const data = await res.json();
      if (data.success) {
        alert("❌ Bekor qilindi, balans qaytarildi!");
        fetchRefWithdrawals();
      } else {
        alert("❌ Xato: " + data.error);
      }
    } catch (err) {
      console.error("❌ Reject error:", err);
      alert("Server xato!");
    }
  };

  // Admin: Adjust user balance
  const openBalanceModal = (user) => {
    setBalanceModal({
      username: user.username,
      currentBalance: user.referral_balance || 0
    });
    setBalanceAmount("");
  };

  const adjustBalance = async (action) => {
    if (!balanceModal || !balanceAmount) return;
    
    const amount = parseInt(balanceAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("❌ Noto'g'ri miqdor!");
      return;
    }

    const confirmMsg = action === "add" 
      ? `➕ @${balanceModal.username} ga ${amount} ⭐ qo'shilsinmi?`
      : `➖ @${balanceModal.username} dan ${amount} ⭐ ayirilsinmi?`;

    if (!window.confirm(confirmMsg)) return;

    setBalanceLoading(true);
    try {
      const res = await apiFetch(`/api/admin/users/${balanceModal.username}/balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, action }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`✅ Balans o'zgartirildi!\n${data.previousBalance} → ${data.newBalance} ⭐`);
        setBalanceModal(null);
        setBalanceAmount("");
        fetchUsers(); // Refresh users list
      } else {
        alert("❌ Xato: " + data.error);
      }
    } catch (err) {
      console.error("❌ Balance adjust error:", err);
      alert("Server xato!");
    } finally {
      setBalanceLoading(false);
    }
  };

  // Load referrer info and referrals when opening user modal
  const loadUserReferralsData = async (userId) => {
    setReferralsLoading(true);
    try {
      // Fetch referrer info if exists
      if (userModal?.referrer_user_id) {
        const referrerRes = await apiFetch(`/api/admin/user/${userModal.referrer_user_id}`);
        const referrerData = await referrerRes.json();
        if (referrerData) {
          setReferrerInfo(referrerData);
        }
      }
      
      // Fetch all referrals by this user
      const referralsRes = await apiFetch(`/api/admin/user/${userId}/referrals`);
      const referralsData = await referralsRes.json();
      if (Array.isArray(referralsData)) {
        setUserReferrals(referralsData);
      }
    } catch (err) {
      console.error("❌ Load referrals error:", err);
    } finally {
      setReferralsLoading(false);
    }
  };

  // Remove a referral relationship
  const removeReferral = async (referralUserId) => {
    if (!userModal) return;
    
    // Find the referral user to show username
    const referralUser = userReferrals?.find(r => r.id === referralUserId);
    const username = referralUser?.username || "Unknown";
    
    console.log(`\n🔍 REFERRAL O'CHIRISH JARAYONI BOSHLANDI`);
    console.log(`📋 Referralni o'chirayotgan user: @${userModal.username} (ID: ${userModal.user_id})`);
    console.log(`🗑️ O'chiriladigan referral: @${username} (ID: ${referralUserId})`);
    console.log(`📝 Amalga oshiriladigan: user.referrer_user_id = NULL`);
    
    if (!window.confirm(`@${username} foydalanuvchining referral munosabatini o'chirmoqchimisiz?\n\nBu amal referrer_user_id ni NULL qib qo'yadi.`)) {
      console.log(`⚠️ Foydalanuvchi bekor qildi`);
      return;
    }
    
    try {
      console.log(`⏳ Backend ga POST so'rov yuborilmoqda: /api/admin/user/${referralUserId}/remove-referrer`);
      const res = await apiFetch(`/api/admin/user/${referralUserId}/remove-referrer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      
      const response = await res.json();
      
      if (res.ok) {
        console.log(`✅ O'CHIRISH MUVAFFAQIYATLI!`);
        console.log(`📊 Backend javobi:`, response);
        console.log(`🔄 Referrallar ro'yxati yangilanimoqda...`);
        alert(`✅ @${username} ning referral munosabati o'chirildi!\nReferrer_user_id = NULL`);
        loadUserReferralsData(userModal.user_id);
      } else {
        console.error(`❌ O'CHIRISH MUVAFFAQ BO'LMADI:`, response);
        alert(`❌ Xato yuz berdi: ${response.error || "Noma'lum xato"}`);
      }
    } catch (err) {
      console.error(`❌ Network yoki server xato:`, err);
      alert("Server xato!");
    }
  };

  // Admin: Adjust user som balance
  const openSomBalanceModal = (user) => {
    setSomBalanceModal({
      username: user.username,
      currentBalance: user.som_balance || 0
    });
    setSomBalanceAmount("");
  };

  const adjustSomBalance = async (action) => {
    if (!somBalanceModal || !somBalanceAmount) return;

    const amount = parseInt(somBalanceAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Noto'g'ri miqdor!");
      return;
    }

    const confirmMsg = action === "add"
      ? `@${somBalanceModal.username} ga ${amount.toLocaleString()} so'm qo'shilsinmi?`
      : `@${somBalanceModal.username} dan ${amount.toLocaleString()} so'm ayirilsinmi?`;

    if (!window.confirm(confirmMsg)) return;

    setSomBalanceLoading(true);
    try {
      const res = await apiFetch(`/api/admin/users/${somBalanceModal.username}/som-balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, action }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Balans o'zgartirildi!\n${data.previousBalance.toLocaleString()} → ${data.newBalance.toLocaleString()} so'm`);
        setSomBalanceModal(null);
        setSomBalanceAmount("");
        fetchUsers();
      } else {
        alert("Xato: " + data.error);
      }
    } catch (err) {
      console.error("Som balance adjust error:", err);
      alert("Server xato!");
    } finally {
      setSomBalanceLoading(false);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    const s = search.toLowerCase();
    return (
      tx.username?.toLowerCase().includes(s) ||
      tx.sender_username?.toLowerCase().includes(s) ||
      tx.recipient?.toLowerCase().includes(s) ||
      tx.owner_user_id?.toString().includes(s) ||
      tx.id.toString().includes(s)
    );
  });

  const filteredUsers = users.filter((u) => {
    const s = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(s) ||
      u.referral_code?.toLowerCase().includes(s)
    );
  });

  // Show last 20 or all
  const displayedTransactions = showAll 
    ? filteredTransactions 
    : filteredTransactions.slice(0, 20);

  const getStatusColor = (status) => {
    const colors = {
      pending: "#f39c12",
      completed: "#27ae60",
      expired: "#e74c3c",
      stars_sent: "#3498db",
      premium_sent: "#3498db",
      gift_sent: "#9b59b6",
      failed: "#9b59b6",
      error: "#8e44ad",
      processing: "#3498db",
      delivered: "#27ae60"
    };
    return colors[status] || "#95a5a6";
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: "⏳",
      completed: "✅",
      expired: "❌",
      stars_sent: "🌟",
      premium_sent: "💎",
      gift_sent: "🎁",
      failed: "⚠️",
      error: "🔴"
    };
    return icons[status] || "❓";
  };

  return (
    <div className="admin-panel-new">
      {/* Header with controls */}
      <header className="admin-header-v2">
        <div className="header-compact-row">
          <h1 className="header-title">
            <span className="header-title-icon">⚡</span>
            <span className="header-title-text">Admin</span>
          </h1>

          <div className={`site-mini site-mini--compact ${maintenanceMode ? "off" : "on"}`}>
            <span className="site-dot" />
            <span className="site-txt">{maintenanceMode ? "OFF" : "ON"}</span>
            <button
              type="button"
              className="site-toggle"
              onClick={toggleMaintenance}
              disabled={maintenanceLoading}
              aria-label="Sayt rejimi"
            >
              <span className={`toggle-track ${maintenanceMode ? "active" : ""}`}>
                <span className="toggle-thumb" />
              </span>
            </button>
          </div>

          <button
            type="button"
            className="header-paymee-pill"
            onClick={() => goToTab("analytics")}
            title="Paymee API balansi — Analitika"
            aria-label="Paymee API balansi, Analitika tabiga o'tish"
          >
            <span className="header-paymee-pill-label">Paymee</span>
            <span className="header-paymee-pill-sep">·</span>
            <span className="header-paymee-pill-value">{formatHeaderPaymeeBalance()}</span>
          </button>

          <div className="header-top-actions">
            <button
              className="hdr-btn refresh hdr-btn--sm"
              type="button"
              aria-label="Yangilash"
              onClick={() => {
                fetchHeaderPaymeeBalance();
                if (activeTab === "transactions") fetchTransactions();
                else if (activeTab === "users") fetchUsers();
                else if (activeTab === "premium") fetchPremiumOrders();
                else if (activeTab === "gift") fetchGiftOrders();
                else if (activeTab === "settings") fetchDiscountPackages();
                else if (activeTab === "referrals") fetchReferralRequests(referralFilter);
                else if (activeTab === "analytics") {
                  fetchAnalytics();
                  fetchGrowth();
                  fetchWalletAndPrices();
                }
              }}
            >
              🔄
            </button>
            <button
              className="hdr-btn referral-bell hdr-btn--sm"
              type="button"
              onClick={() => goToTab("referrals")}
              title="Referral requests"
              aria-label="Referral"
            >
              🔔
              {referralRequests.filter((r) => !r.is_accepted && !r.rejected_at).length > 0 && (
                <span className="hdr-badge">
                  {referralRequests.filter((r) => !r.is_accepted && !r.rejected_at).length}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="header-btns header-toolbar-scroll header-secondary-nav">
          {SECONDARY_NAV_HEADER.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`hdr-nav-btn ${activeTab === item.id ? "active" : ""}`}
              onClick={() =>
                goToTab(
                  item.id === "analytics" && activeTab === "analytics"
                    ? "transactions"
                    : item.id
                )
              }
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Asosiy 4 tab — header ostida (mobil + desktop) */}
      <div className="tabs tabs-primary">
        <button
          type="button"
          className={`tab ${activeTab === "transactions" ? "active" : ""}`}
          onClick={() => goToTab("transactions")}
        >
          ⭐ Stars
        </button>
        <button
          type="button"
          className={`tab ${activeTab === "premium" ? "active" : ""}`}
          onClick={() => goToTab("premium")}
        >
          💎 Premium
        </button>
        <button
          type="button"
          className={`tab ${activeTab === "gift" ? "active" : ""}`}
          onClick={() => goToTab("gift")}
        >
          🎁 Gift
        </button>
        <button
          type="button"
          className={`tab ${activeTab === "users" ? "active" : ""}`}
          onClick={() => goToTab("users")}
        >
          👥 Users
        </button>
      </div>

      <div className="admin-main">

      {/* ==================== NOTIFICATIONS TAB ==================== */}
      {activeTab === "notifications" && (
        <div className="tab-content notifications-section">
          <h3 style={{margin: "0 0 16px", fontSize: "1.1rem", color: "#fff"}}>🔔 Bildirishnoma yuborish</h3>
          
          <input
            type="text"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
              fontSize: "14px",
              marginBottom: "10px"
            }}
            placeholder="Sarlavha..."
            value={notifTitle}
            onChange={(e) => setNotifTitle(e.target.value)}
          />
          
          <textarea
            style={{
              width: "100%",
              minHeight: "80px",
              padding: "12px 14px",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
              fontSize: "14px",
              fontFamily: "inherit",
              resize: "vertical",
              marginBottom: "10px"
            }}
            placeholder="Xabar matni..."
            value={notifMessage}
            onChange={(e) => setNotifMessage(e.target.value)}
          />
          
          <div style={{display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap"}}>
            {["info", "success", "warning", "promo"].map(t => (
              <button
                key={t}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: notifType === t ? "2px solid #3b82f6" : "1px solid rgba(255,255,255,0.15)",
                  background: notifType === t ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontSize: "13px",
                  cursor: "pointer"
                }}
                onClick={() => setNotifType(t)}
              >
                {t === "info" ? "ℹ️ Info" : t === "success" ? "✅ Success" : t === "warning" ? "⚠️ Warning" : "🎁 Promo"}
              </button>
            ))}
          </div>
          
          <div style={{display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px"}}>
            <label style={{display: "flex", alignItems: "center", gap: "8px", color: "#fff", fontSize: "14px", cursor: "pointer"}}>
              <input
                type="checkbox"
                checked={notifGlobal}
                onChange={(e) => setNotifGlobal(e.target.checked)}
                style={{width: "18px", height: "18px", accentColor: "#3b82f6"}}
              />
              🌐 Barchaga yuborish
            </label>
          </div>
          
          {!notifGlobal && (
            <input
              type="text"
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)",
                color: "#fff",
                fontSize: "14px",
                marginBottom: "12px"
              }}
              placeholder="User ID (Telegram)"
              value={notifUserId}
              onChange={(e) => setNotifUserId(e.target.value)}
            />
          )}
          
          <button
            style={{
              width: "100%",
              padding: "14px",
              background: notifSending ? "rgba(59,130,246,0.3)" : "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              border: "none",
              borderRadius: "12px",
              color: "#fff",
              fontSize: "15px",
              fontWeight: "600",
              cursor: notifSending ? "not-allowed" : "pointer",
              opacity: (!notifTitle.trim() || !notifMessage.trim() || (!notifGlobal && !notifUserId.trim())) ? 0.5 : 1,
              marginBottom: "16px"
            }}
            onClick={sendNotification}
            disabled={notifSending || !notifTitle.trim() || !notifMessage.trim() || (!notifGlobal && !notifUserId.trim())}
          >
            {notifSending ? "Yuborilmoqda..." : "🔔 Bildirishnoma yuborish"}
          </button>
          
          <h4 style={{margin: "20px 0 12px", fontSize: "1rem", color: "rgba(255,255,255,0.8)"}}>📋 Oxirgi bildirishnomalar</h4>
          
          <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
            {notifHistory.length === 0 ? (
              <div style={{textAlign: "center", padding: "20px", color: "rgba(255,255,255,0.5)", fontSize: "14px"}}>
                Hozircha bildirishnomalar yo'q
              </div>
            ) : (
              notifHistory.map(n => (
                <div 
                  key={n.id}
                  style={{
                    padding: "12px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)"
                  }}
                >
                  <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px"}}>
                    <div style={{fontWeight: "600", color: "#fff", fontSize: "14px"}}>
                      {n.type === "info" ? "ℹ️" : n.type === "success" ? "✅" : n.type === "warning" ? "⚠️" : "🎁"} {n.title}
                    </div>
                    <button
                      onClick={() => deleteNotification(n.id)}
                      style={{
                        background: "rgba(239,68,68,0.2)",
                        border: "none",
                        borderRadius: "6px",
                        color: "#ef4444",
                        padding: "4px 8px",
                        fontSize: "12px",
                        cursor: "pointer"
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                  <div style={{color: "rgba(255,255,255,0.7)", fontSize: "13px", marginBottom: "6px"}}>{n.message}</div>
                  <div style={{display: "flex", gap: "8px", fontSize: "11px", color: "rgba(255,255,255,0.4)"}}>
                    <span>{n.is_global ? "🌐 Global" : `👤 ${n.user_id}`}</span>
                    <span>•</span>
                    <span>{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== ANALYTICS TAB ==================== */}
      {activeTab === "analytics" && (
        <div className="tab-content analytics-list">
          <div className="paymee-balance-hero">
            <span className="paymee-balance-hero-label">💳 Paymee API balansi</span>
            <span className="paymee-balance-hero-value">
              {walletLoading
                ? "..."
                : !paymeeWallet.configured
                  ? "— (API sozlanmagan)"
                  : paymeeWallet.error
                    ? paymeeWallet.error
                    : `${Number(paymeeWallet.balanceUsdt).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} ${paymeeWallet.currency}`}
            </span>
            {!walletLoading && paymeeWallet.configured && !paymeeWallet.error && paymeeWallet.usdtPerStar > 0 && (
              <span className="paymee-balance-hero-sub">
                ≈ {getAvailableStars().toLocaleString()} stars (
                {paymeeWallet.balanceUsdt} ÷ {paymeeWallet.usdtPerStar} USDT)
              </span>
            )}
          </div>

          {/* Period Filter */}
          <div className="period-row">
            {["day", "week", "month", "all"].map(p => (
              <button 
                key={p}
                className={`period-chip ${analyticsPeriod === p ? "active" : ""}`}
                onClick={() => setAnalyticsPeriod(p)}
              >
                {p === "day" ? "Kun" : p === "week" ? "Hafta" : p === "month" ? "Oy" : "Barchasi"}
              </button>
            ))}
          </div>

          {/* Wallet Info List */}
          <div className="info-list wallet-list">
            <div className="info-row">
              <span className="info-label">⭐ Mavjud stars (Paymee):</span>
              <span className="info-value gold">
                {walletLoading
                  ? "..."
                  : !paymeeWallet.configured
                    ? "—"
                    : paymeeWallet.error
                      ? "—"
                      : getAvailableStars().toLocaleString()}
              </span>
            </div>
            <div className="info-row info-row--userbot-refill">
              <div className="userbot-refill-main">
                <span className="info-label">⭐ Userbot balansi:</span>
                <span className="info-value gold">
                  {walletLoading ? "..." : `${botStarsBalance.toLocaleString()} ⭐`}
                  {!walletLoading && botStarsBalance < userbotRefillMin && (
                    <span className="userbot-refill-warn"> (min {userbotRefillMin})</span>
                  )}
                </span>
              </div>
              <div
                className={`site-mini site-mini--compact userbot-refill-toggle ${userbotRefillEnabled ? "on" : "off"}`}
                title="Balans past bo'lsa Paymee orqali avto to'ldirish"
              >
                <span className="site-dot" />
                <span className="site-txt">Avto {userbotRefillEnabled ? "ON" : "OFF"}</span>
                <button
                  type="button"
                  className="site-toggle"
                  disabled={userbotRefillToggleLoading || walletLoading}
                  onClick={toggleUserbotRefill}
                  aria-label="Userbot avto to'ldirish"
                >
                  <span className={`toggle-track ${userbotRefillEnabled ? "active" : ""}`}>
                    <span className="toggle-thumb" />
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Sales Stats List */}
          {analyticsLoading ? (
            <div className="analytics-loading-v2">⏳ Yuklanmoqda...</div>
          ) : (
            <div className="info-list sales-list">
              <div className="info-row total-row">
                <span className="info-label">📈 Jami savdo:</span>
                <span className="info-value">
                  <b>{analyticsData.total.count}</b> ta &nbsp;·&nbsp; <b>{analyticsData.total.totalAmount.toLocaleString()}</b> so'm
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">⭐ Stars:</span>
                <span className="info-value">
                  {analyticsData.stars.count} ta &nbsp;·&nbsp; {analyticsData.stars.totalStars.toLocaleString()} stars &nbsp;·&nbsp; {analyticsData.stars.totalAmount.toLocaleString()} so'm
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">💎 Premium:</span>
                <span className="info-value">
                  {analyticsData.premium.count} ta &nbsp;·&nbsp; {analyticsData.premium.totalAmount.toLocaleString()} so'm
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">🎁 Gift:</span>
                <span className="info-value">
                  {analyticsData.gift.count} ta &nbsp;·&nbsp; {analyticsData.gift.totalStars.toLocaleString()} stars &nbsp;·&nbsp; {analyticsData.gift.totalAmount.toLocaleString()} so'm
                </span>
              </div>
            </div>
          )}

          {/* ===== Foydalanuvchilar o'sishi ===== */}
          {growthLoading ? (
            <div className="analytics-loading-v2">⏳ Foydalanuvchi analitikasi yuklanmoqda...</div>
          ) : !growth ? (
            <div className="info-list">
              <div className="list-title">👥 Foydalanuvchilar</div>
              <div className="info-row no-data">
                <span className="info-label">Ma'lumot yuklanmadi</span>
              </div>
            </div>
          ) : (
            <>
              <div className="info-list users-growth-list">
                <div className="list-title">👥 Yangi foydalanuvchilar</div>
                {[
                  ["Bugun", "day"],
                  ["7 kun", "week"],
                  ["Shu oy", "month"],
                  ["Jami", "total"],
                ].map(([label, key]) => (
                  <div key={key} className={`info-row ${growth.users[key] > 0 ? "has-data" : "no-data"}`}>
                    <span className="info-label">{label}:</span>
                    <span className="info-value">
                      <b>{growth.users[key].toLocaleString()}</b> ta
                      &nbsp;·&nbsp; referaldan <b>{growth.referral_users[key].toLocaleString()}</b>
                    </span>
                  </div>
                ))}
                <div className="info-row">
                  <span className="info-label">✅ Referal + kanalga obuna:</span>
                  <span className="info-value gold">
                    {growth.referral_users.subscribed.toLocaleString()} ta
                  </span>
                </div>
              </div>

              {/* ===== Bonus missiya sovg'alari ===== */}
              <div className="info-list bonus-stats-list">
                <div className="list-title">🎯 Bonus missiya sovg'alari</div>
                <div className="info-row total-row">
                  <span className="info-label">📈 Jami topshirilgan:</span>
                  <span className="info-value">
                    <b>{growth.bonus.total_delivered}</b> ta
                    &nbsp;·&nbsp; <b>{growth.bonus.total_stars_spent.toLocaleString()}</b> ⭐
                    {growth.bonus.total_failed > 0 && (
                      <>&nbsp;·&nbsp; <span className="bonus-failed">{growth.bonus.total_failed} xato</span></>
                    )}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">🗓 Claim: bugun / 7 kun / oy:</span>
                  <span className="info-value">
                    {growth.bonus.claims.day} &nbsp;·&nbsp; {growth.bonus.claims.week} &nbsp;·&nbsp; {growth.bonus.claims.month}
                  </span>
                </div>

                {growth.bonus.levels.map((lv) => (
                  <div key={lv.level} className={`info-row ${lv.delivered > 0 ? "has-data" : "no-data"}`}>
                    <span className="info-label">
                      {lv.level}. {lv.label} <small>({lv.required} do'st · {lv.gift_stars}⭐)</small>
                    </span>
                    <span className="info-value">
                      <b>{lv.delivered}</b> yetkazildi
                      {lv.failed > 0 && <> &nbsp;·&nbsp; <span className="bonus-failed">{lv.failed} xato</span></>}
                    </span>
                  </div>
                ))}
              </div>

              {/* ===== Kunlik yangi foydalanuvchilar ===== */}
              <div className="info-list daily-list">
                <div className="list-title">📅 Kunlik yangi foydalanuvchilar</div>
                {[...growth.daily].reverse().map((d) => (
                  <div key={d.date} className={`info-row ${d.total > 0 ? "has-data" : "no-data"}`}>
                    <span className="info-label">
                      {new Date(d.date).toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" })}
                    </span>
                    <span className="info-value">
                      {d.total} ta &nbsp;·&nbsp; referaldan {d.referral}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Daily Stats */}
          <div className="info-list daily-list">
            <div className="list-title">📅 Kunlik statistika</div>
            {[...dailyStats].reverse().map((day, i) => {
              const currentAmount = day.amount;
              const currentCount = day.count;
              
              return (
                <div key={i} className={`info-row ${currentCount > 0 ? 'has-data' : 'no-data'}`}>
                  <span className="info-label">{new Date(day.date).toLocaleDateString('uz-UZ', {day: '2-digit', month: 'short'})}</span>
                  <span className="info-value">
                    {currentCount} ta &nbsp;·&nbsp; {currentAmount.toLocaleString()} so'm
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================== TRANSACTIONS TAB ==================== */}
      {activeTab === "transactions" && (
        <div className="tab-content">
          {/* Stats Text */}
          <div className="stats-text">
            <span>Total: <b>{stats.totalStars}</b></span>
            <span>Pending: <b>{stats.pending}</b></span>
            <span>Sent: <b>{stats.stars_sent}</b></span>
            <span>Done: <b>{stats.completed}</b></span>
            <span>Expired: <b>{stats.expired}</b></span>
            <span>Failed: <b>{stats.failed + stats.error}</b></span>
          </div>

          {/* Filters */}
          <div className="filters">
            <input
              type="text"
              placeholder="🔍 Qidiruv..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
            <AdminCustomSelect
              className="admin-custom-select--filter"
              value={filter}
              onChange={setFilter}
              options={ORDER_STATUS_FILTER_OPTIONS}
              ariaLabel="Status filtri"
            />
          </div>

          {/* Orders List */}
          {loading && !autoRefresh ? (
            <div className="loader">⏳ Yuklanmoqda...</div>
          ) : (
            <div className="orders-list">
              {displayedTransactions.length === 0 ? (
                <div className="empty-state">📭 Buyurtmalar yo'q</div>
              ) : (
                displayedTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className={getOrderCardClassName(tx)}
                  >
                    {isPaymeeOrder(tx) && (
                      <span className="order-card-provider-badge order-card-provider-badge--paymee">
                        Paymee
                      </span>
                    )}
                    {/* Order Header - Horizontal */}
                    <div 
                      className="order-header"
                      onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                      style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}
                    >
                      <div className="order-main" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span className="order-user" style={{ fontWeight: "bold" }}>@{tx.sender_username || tx.owner_user_id || '?'} → @{tx.username || tx.recipient || '?'}</span>
                          {isFragmentOrder(tx) && (
                            <span style={{ fontSize: "10px", background: "#6c5ce7", color: "#fff", padding: "2px 6px", borderRadius: "4px" }}>Fragment</span>
                          )}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--tg-theme-hint-color, #999)" }}>
                          {new Date(tx.created_at).toLocaleString()} • {tx.amount?.toLocaleString()} so'm
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                        <span className="order-stars">{tx.stars} ⭐</span>
                        <div 
                          className="order-status"
                          style={{ backgroundColor: getStatusColor(tx.status) }}
                        >
                          {getStatusIcon(tx.status)} {tx.status}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedId === tx.id && (
                      <div className="order-details">
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="detail-label">Yuboruvchi</span>
                            <span className="detail-value">@{tx.sender_username || '-'} ({tx.owner_user_id || '-'})</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Qabul qiluvchi</span>
                            <span className="detail-value">@{tx.username} ({tx.recipient || '-'})</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Amount</span>
                            <span className="detail-value">{tx.amount?.toLocaleString()} so'm</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Transaction ID</span>
                            <span className="detail-value">{tx.transaction_id || "-"}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Created</span>
                            <span className="detail-value">{new Date(tx.created_at).toLocaleString()}</span>
                          </div>
                        </div>

                        {(starsCanAdminSend(tx.status) ||
                          tx.status === "pending" ||
                          tx.status === "error" ||
                          tx.status === "processing") && (
                          <div className="order-actions">
                            {starsCanAdminSend(tx.status) &&
                              renderAdminSendButton(tx.id, () =>
                                adminSendStars(tx.id, tx.status)
                              )}
                            {(tx.status === "pending" ||
                              tx.status === "error" ||
                              tx.status === "processing") && (
                              <button
                                className="action-btn expire"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatus(tx.id, "expired");
                                }}
                              >
                                ❌ Expire
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Show All Button */}
              {filteredTransactions.length > 20 && !showAll && (
                <button className="show-all-btn" onClick={() => setShowAll(true)}>
                  📋 Barcha buyurtmalarni ko'rish ({filteredTransactions.length} ta)
                </button>
              )}

              {showAll && filteredTransactions.length > 20 && (
                <button className="show-all-btn" onClick={() => setShowAll(false)}>
                  🔼 Faqat oxirgi 20 tani ko'rish
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== GIFT ORDERS TAB ==================== */}
      {activeTab === "gift" && (
        <div className="tab-content">
          {/* Gift Stats */}
          <div className="stats-text">
            <span>Jami: <b>{giftStats.total}</b></span>
            <span>Pending: <b>{giftStats.pending}</b></span>
            <span>Completed: <b>{giftStats.completed}</b></span>
            <span>Sent: <b>{giftStats.gift_sent}</b></span>
            <span>Expired: <b>{giftStats.expired}</b></span>
            <span>Failed: <b>{giftStats.failed}</b></span>
          </div>

          {/* Gift Filters */}
          <div className="filters">
            <input
              type="text"
              placeholder="🔍 Qidiruv..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
            <AdminCustomSelect
              className="admin-custom-select--filter"
              value={giftFilter}
              onChange={setGiftFilter}
              options={GIFT_STATUS_FILTER_OPTIONS}
              ariaLabel="Gift status"
            />
          </div>

          {loading && !autoRefresh ? (
            <div className="loader">⏳ Yuklanmoqda...</div>
          ) : (
            <div className="orders-list">
              {giftOrders.length === 0 ? (
                <div className="empty-state">🎁 Gift buyurtmalar yo'q</div>
              ) : (
                giftOrders
                  .filter((tx) => {
                    const s = search.toLowerCase();
                    return (
                      tx.username?.toLowerCase().includes(s) ||
                      tx.sender_username?.toLowerCase().includes(s) ||
                      tx.recipient_username?.toLowerCase().includes(s) ||
                      tx.owner_user_id?.toString().includes(s) ||
                      tx.id.toString().includes(s)
                    );
                  })
                  .slice(0, giftShowAll ? giftOrders.length : 20)
                  .map((tx) => (
                  <div key={tx.id} className={getOrderCardClassName(tx)}>
                    <div 
                      className="order-header order-header--gift"
                      onClick={() => setGiftExpandedId(giftExpandedId === tx.id ? null : tx.id)}
                      style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}
                    >
                      <div className="order-main" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span className="order-user" style={{ fontWeight: "bold" }}>@{tx.sender_username || tx.owner_user_id || '?'} → @{tx.recipient_username || tx.username || '?'}</span>
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--tg-theme-hint-color, #999)" }}>
                          {new Date(tx.created_at).toLocaleString()} • {tx.amount?.toLocaleString()} so'm
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {tx.gift_id && getGiftStickerPath(tx.gift_id) && (
                          <div
                            className="admin-gift-sticker-wrap admin-gift-sticker-wrap--header"
                            onClick={(e) => e.stopPropagation()}
                            title={`Gift: ${tx.gift_id}`}
                          >
                            <TGSSticker
                              stickerPath={getGiftStickerPath(tx.gift_id)}
                              className="admin-gift-sticker admin-gift-sticker--header"
                              autoplay
                              loop
                            />
                          </div>
                        )}
                        <span className="order-stars">{tx.stars} ⭐ 🎁</span>
                        <div 
                          className="order-status"
                          style={{ backgroundColor: getStatusColor(tx.status) }}
                        >
                          {getStatusIcon(tx.status)} {tx.status}
                        </div>
                      </div>
                    </div>

                    {giftExpandedId === tx.id && (
                      <div className="order-details">
                        {tx.gift_id && getGiftStickerPath(tx.gift_id) && (
                          <div className="admin-gift-sticker-preview">
                            <TGSSticker
                              stickerPath={getGiftStickerPath(tx.gift_id)}
                              className="admin-gift-sticker admin-gift-sticker--detail"
                              autoplay
                              loop
                            />
                            <span className="admin-gift-sticker-caption">{tx.stars} ⭐ gift</span>
                          </div>
                        )}
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="detail-label">Kimdan</span>
                            <span className="detail-value">@{tx.sender_username || tx.owner_user_id}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Kimga</span>
                            <span className="detail-value">@{tx.recipient_username}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Gift ID</span>
                            <span className="detail-value" style={{fontSize: '11px'}}>{tx.gift_id || "—"}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Stars</span>
                            <span className="detail-value">{tx.stars} ⭐</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Amount</span>
                            <span className="detail-value">{tx.amount?.toLocaleString()} so'm</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Payment</span>
                            <span className="detail-value">{tx.payment_method || "card"}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Anonim</span>
                            <span className="detail-value">{tx.gift_anonymous ? "Ha ✅" : "Yo'q"}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Izoh</span>
                            <span className="detail-value">{tx.gift_comment || "-"}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Created</span>
                            <span className="detail-value">{new Date(tx.created_at).toLocaleString()}</span>
                          </div>
                        </div>

                        {(giftCanAdminSend(tx.status) ||
                          tx.status === "pending" ||
                          tx.status === "error" ||
                          tx.status === "processing") && (
                          <div className="order-actions">
                            {giftCanAdminSend(tx.status) &&
                              renderAdminSendButton(tx.id, () =>
                                adminSendGift(tx.id, tx.status)
                              )}
                            {(tx.status === "pending" ||
                              tx.status === "error" ||
                              tx.status === "processing") && (
                              <button
                                className="action-btn expire"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  expireGiftOrder(tx.id);
                                }}
                              >
                                ❌ Expired qilish
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Show All Button */}
              {giftOrders.length > 20 && !giftShowAll && (
                <button className="show-all-btn" onClick={() => setGiftShowAll(true)}>
                  🎁 Barcha buyurtmalarni ko'rish ({giftOrders.length} ta)
                </button>
              )}

              {giftShowAll && giftOrders.length > 20 && (
                <button className="show-all-btn" onClick={() => setGiftShowAll(false)}>
                  🔼 Faqat oxirgi 20 tani ko'rish
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== USERS TAB ==================== */}
      {activeTab === "users" && (
        <div className="tab-content">
          {/* User Stats */}
          <div className="stats-text">
            <span>Jami: <b>{userStats.total}</b></span>
            <span>Bugun: <b>{userStats.today}</b></span>
            <span>Referrals: <b>{userStats.totalReferrals}</b></span>
          </div>

          {/* Search */}
          <div className="filters" style={{ padding: '0 10px' }}>
            <input
              type="text"
              placeholder="🔍 Username yoki referral code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
              style={{
                width: '100%',
                padding: '12px 15px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.2)',
                color: '#fff'
              }}
            />
          </div>

          {/* Users List */}
          {loading && !autoRefresh ? (
            <div className="loader">⏳ Yuklanmoqda...</div>
          ) : (
            <div className="users-list" style={{ padding: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
              {filteredUsers.length === 0 ? (
                <div className="empty-state">👤 Foydalanuvchilar yo'q</div>
              ) : (
                filteredUsers.slice(0, showAll ? filteredUsers.length : 20).map((u, index) => (
                  <div 
                    key={u.id} 
                    className="user-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: selectedUserCard?.id === u.id ? '2px solid #667eea' : '1px solid rgba(255,255,255,0.1)',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                    }}
                  >
                    {/* User Info Section */}
                    <div 
                      onClick={() => {
                        setSelectedUserCard(selectedUserCard?.id === u.id ? null : u);
                      }}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 1fr auto',
                        alignItems: 'center',
                        padding: '14px 12px',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        gap: '10px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = ''}
                    >
                      <div style={{
                        width: '30px',
                        height: '30px',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#fff'
                      }}>
                        {filteredUsers.length - index}
                      </div>
                      
                      <div className="user-main" style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                        <span className="user-name" style={{
                          fontSize: '15px', 
                          fontWeight: '600', 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis'
                        }}>
                          @{u.username || 'Noma\'lum'}
                        </span>
                        <span className="user-id" style={{fontSize: '12px', color: 'rgba(255,255,255,0.5)'}}>
                          ID: {u.user_id}
                        </span>
                      </div>
                      
                      <div className="user-stats" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '6px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Yulduzlar:</span>
                          <span style={{fontSize: '14px', fontWeight: 'bold', color: '#ffd700'}}>{u.referral_balance || 0}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Do'stlar:</span>
                          <span style={{fontSize: '14px', fontWeight: '600', color: '#4caf50'}}>{u.total_referrals || 0}</span>
                        </div>
                        {u.som_balance > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>So'm:</span>
                            <span style={{fontSize: '13px', color: '#f9a825'}}>{(u.som_balance || 0).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons - Show below user info */}
                    {selectedUserCard?.id === u.id && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        padding: '10px 12px',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: 'rgba(0,0,0,0.3)'
                      }}>
                        <button
                          onClick={() => {
                            setUserModal(u);
                            setUserDetailsModalType("info");
                            loadUserReferralsData(u.user_id);
                          }}
                          style={{
                            padding: '12px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: '#fff',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'transform 0.1s',
                          }}
                          onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
                          onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                        >
                          ℹ️ Ma'lumot
                        </button>
                        <button
                          onClick={() => {
                            setUserModal(u);
                            setUserDetailsModalType("referrals");
                            loadUserReferralsData(u.user_id);
                          }}
                          style={{
                            padding: '12px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #f9a825 0%, #f08a5d 100%)',
                            color: '#fff',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'transform 0.1s'
                          }}
                          onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
                          onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                        >
                          👥 Referallar
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}

              {filteredUsers.length > 20 && !showAll && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <button className="show-all-btn" onClick={() => setShowAll(true)}>
                    👥 Barcha foydalanuvchilar ({filteredUsers.length} ta)
                  </button>
                </div>
              )}

              {showAll && filteredUsers.length > 20 && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <button className="show-all-btn" onClick={() => setShowAll(false)}>
                    🔼 Faqat 20 tani ko'rish
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== PREMIUM ORDERS TAB ==================== */}
      {activeTab === "premium" && (
        <div className="tab-content">
          <div className="admin-premium-manual-actions">
            <span className="admin-premium-manual-label">Qo&apos;lda premium order</span>
            <div className="admin-premium-manual-btns">
              <button
                type="button"
                className="admin-premium-manual-btn admin-premium-manual-btn--month"
                onClick={() => openManualPremiumModal("1_oy")}
              >
                <span className="admin-premium-manual-btn-icon">💎</span>
                <span className="admin-premium-manual-btn-text">
                  <strong>1 oylik</strong>
                  <small>57 000 so&apos;m</small>
                </span>
              </button>
              <button
                type="button"
                className="admin-premium-manual-btn admin-premium-manual-btn--year"
                onClick={() => openManualPremiumModal("1_yil")}
              >
                <span className="admin-premium-manual-btn-icon">👑</span>
                <span className="admin-premium-manual-btn-text">
                  <strong>1 yillik</strong>
                  <small>320 000 so&apos;m</small>
                </span>
              </button>
            </div>
          </div>

          {/* Premium Stats */}
          <div className="stats-text">
            <span>Jami: <b>{premiumStats.total}</b></span>
            <span>Pending: <b>{premiumStats.pending}</b></span>
            <span>Sent: <b>{premiumStats.delivered}</b></span>
            <span>Expired: <b>{premiumStats.expired}</b></span>
            <span>Failed: <b>{premiumStats.failed}</b></span>
          </div>

          {/* Premium Filters */}
          <div className="filters">
            <input
              type="text"
              placeholder="🔍 Qidiruv..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
            <AdminCustomSelect
              className="admin-custom-select--filter"
              value={premiumFilter}
              onChange={setPremiumFilter}
              options={PREMIUM_STATUS_FILTER_OPTIONS}
              ariaLabel="Premium status"
            />
          </div>

          {loading && !autoRefresh ? (
            <div className="loader">⏳ Yuklanmoqda...</div>
          ) : (
            <div className="orders-list">
              {premiumOrders.length === 0 ? (
                <div className="empty-state">💎 Premium buyurtmalar yo'q</div>
              ) : (
                premiumOrders
                  .filter((tx) => {
                    const s = search.toLowerCase();
                    return (
                      tx.username?.toLowerCase().includes(s) ||
                      tx.sender_username?.toLowerCase().includes(s) ||
                      tx.recipient?.toLowerCase().includes(s) ||
                      tx.owner_user_id?.toString().includes(s) ||
                      tx.id.toString().includes(s)
                    );
                  })
                  .slice(0, premiumShowAll ? premiumOrders.length : 20)
                  .map((tx) => (
                  <div
                    key={tx.id}
                    className={getOrderCardClassName(tx)}
                  >
                    {isPaymeeOrder(tx) && (
                      <span className="order-card-provider-badge order-card-provider-badge--paymee">
                        Paymee
                      </span>
                    )}
                    <div 
                      className="order-header"
                      onClick={() => setPremiumExpandedId(premiumExpandedId === tx.id ? null : tx.id)}
                      style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}
                    >
                      <div className="order-main" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span className="order-user" style={{ fontWeight: "bold" }}>@{tx.sender_username || tx.owner_user_id || '?'} → @{tx.username || tx.recipient || '?'}</span>
                          {isFragmentOrder(tx) && (
                            <span style={{ fontSize: "10px", background: "#6c5ce7", color: "#fff", padding: "2px 6px", borderRadius: "4px" }}>Fragment</span>
                          )}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--tg-theme-hint-color, #999)" }}>
                          {new Date(tx.created_at).toLocaleString()} • {tx.amount?.toLocaleString()} so'm
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                        <span className="order-stars">{tx.months || 1} oy 💎</span>
                        <div 
                          className="order-status"
                          style={{ backgroundColor: getStatusColor(tx.status === 'delivered' || tx.status === 'premium_sent' ? 'stars_sent' : tx.status) }}
                        >
                          {tx.status === 'delivered' || tx.status === 'premium_sent' ? '💎' : getStatusIcon(tx.status)} {tx.status === 'premium_sent' ? 'delivered' : tx.status}
                        </div>
                      </div>
                    </div>

                    {premiumExpandedId === tx.id && (
                      <div className="order-details">
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="detail-label">Yuboruvchi</span>
                            <span className="detail-value">@{tx.sender_username || '-'} ({tx.owner_user_id || '-'})</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Qabul qiluvchi</span>
                            <span className="detail-value">@{tx.username} ({tx.recipient || '-'})</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Muddat</span>
                            <span className="detail-value">{tx.months || 1} oy</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Amount</span>
                            <span className="detail-value">{tx.amount?.toLocaleString()} so'm</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Payment</span>
                            <span className="detail-value">{tx.payment_method || "card"}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Transaction ID</span>
                            <span className="detail-value">{tx.transaction_id || "-"}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Created</span>
                            <span className="detail-value">{new Date(tx.created_at).toLocaleString()}</span>
                          </div>
                        </div>

                        {(premiumCanAdminSend(tx.status) ||
                          tx.status === "pending" ||
                          tx.status === "error" ||
                          tx.status === "processing") && (
                          <div className="order-actions">
                            {premiumCanAdminSend(tx.status) &&
                              renderAdminSendButton(tx.id, () =>
                                adminSendPremium(tx.id, tx.status)
                              )}
                            {(tx.status === "pending" ||
                              tx.status === "error" ||
                              tx.status === "processing") && (
                              <button
                                className="action-btn expire"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  expirePremiumOrder(tx.id);
                                }}
                              >
                                ❌ Expired qilish
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Show All Button */}
              {premiumOrders.length > 20 && !premiumShowAll && (
                <button className="show-all-btn" onClick={() => setPremiumShowAll(true)}>
                  💎 Barcha buyurtmalarni ko'rish ({premiumOrders.length} ta)
                </button>
              )}

              {premiumShowAll && premiumOrders.length > 20 && (
                <button className="show-all-btn" onClick={() => setPremiumShowAll(false)}>
                  🔼 Faqat oxirgi 20 tani ko'rish
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== PROMOCODES TAB ==================== */}
      {activeTab === "promocodes" && (
        <div className="tab-content settings-tab">
          <div className="section-header">
            <h3 className="settings-section-title">Pramakodlar Boshqaruvi</h3>
            <p className="settings-section-desc">Foydalanuvchilar uchun maxsus chegirma kodlarini yarating</p>
          </div>

          <div className="settings-add-package">
            <form className="package-form" onSubmit={handleCreatePromo}>
              <div className="form-row">
                <div className="form-group">
                  <label>Pramakod KODI</label>
                  <input
                    type="text"
                    required
                    value={promoForm.code}
                    onChange={e => setPromoForm({...promoForm, code: e.target.value.toUpperCase()})}
                    placeholder="Masalan: STARS50"
                  />
                </div>
                <div className="form-group">
                  <label>Chegirma Foizi (%)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={promoForm.discount_percent}
                    onChange={e => setPromoForm({...promoForm, discount_percent: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="form-group">
                  <label>Maksimal Foydalanish</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={promoForm.usage_limit}
                    onChange={e => setPromoForm({...promoForm, usage_limit: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div className="form-row" style={{marginTop: '15px'}}>
                <div className="form-group">
                  <label>Qaysi bo'lim uchun?</label>
                  <div className="custom-select-wrapper">
                    <select
                      value={promoForm.target_type}
                      onChange={e => setPromoForm({...promoForm, target_type: e.target.value, target_amount: ''})}
                    >
                      <option value="stars">Stars</option>
                      <option value="gift">Gifts</option>
                      <option value="premium">Premium</option>
                      <option value="all">Barchasi uchun</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>
                    {promoForm.target_type === 'premium' ? "Qaysi oylar uchun? (ixtiyoriy)" :
                     promoForm.target_type === 'gift' ? "Qaysi gift uchun? (ixtiyoriy)" :
                     promoForm.target_type === 'stars' ? "Stars miqdori (ixtiyoriy)" : 
                     "Aniq miqdor (ixtiyoriy)"}
                  </label>
                  <input
                    type="text"
                    value={promoForm.target_amount}
                    onChange={e => setPromoForm({...promoForm, target_amount: e.target.value})}
                    placeholder={
                      promoForm.target_type === 'premium' ? "Masalan: 3, 6 yoki 12" :
                      promoForm.target_type === 'gift' ? "Masalan: 15, 25, 50, 100" :
                      promoForm.target_type === 'stars' ? "Masalan: 50 (Faqat 50 Stars uchun)" :
                      "Masalan: 50"
                    }
                  />
                </div>
              </div>
              <button className="settings-submit-btn" style={{marginTop: '20px'}} type="submit">
                Yaratish
              </button>
            </form>
          </div>

          <div className="packages-grid">
            {promoLoading ? <div className="loading-state">Yuklanmoqda...</div> : 
             promocodes.map(promo => (
              <div key={promo.code} className={`package-item ${!promo.is_active ? 'inactive' : ''}`}>
                <div className="package-info" style={{marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <span className="package-stars" style={{fontSize: '18px', fontWeight: 'bold', color: '#fff'}}>{promo.code}</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(promo.code);
                        alert(`Skopirovano: ${promo.code}`);
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', padding: '4px 8px', color: '#fff', cursor: 'pointer', fontSize: '12px'
                      }}
                      title="Nusxalash"
                    >
                      Nusxa
                    </button>
                  </div>
                  <span className="package-discount" style={{background: 'rgba(255, 193, 7, 0.2)', color: '#ffc107', padding: '4px 8px', borderRadius: '6px', fontSize: '13px'}}>{promo.discount_percent}%</span>
                </div>
                <div style={{fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between'}}>
                  <span>Maqsad:</span>
                  <span style={{color: '#fff'}}>{promo.target_type === 'all' ? 'Barchasi' : promo.target_type} {promo.target_amount ? `(${promo.target_amount})` : ''}</span>
                </div>
                <div style={{fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between'}}>
                  <span>Foydalanildi:</span>
                  <span style={{color: '#fff'}}>{promo.used_count} / {promo.usage_limit}</span>
                </div>
                <div className="package-actions" style={{display: 'flex', gap: '8px'}}>
                  <button className="action-btn" style={{flex: 1, padding: '10px', background: promo.is_active ? 'rgba(255,255,255,0.1)' : 'rgba(76,175,80,0.2)', color: promo.is_active ? '#fff' : '#4caf50', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: '0.2s'}} onClick={() => handleTogglePromo(promo.code, promo.is_active)}>
                    {promo.is_active ? 'To\'xtatish' : 'Faollashtirish'}
                  </button>
                  <button className="action-btn" style={{padding: '10px 15px', background: 'rgba(244,67,54,0.1)', color: '#f44336', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: '0.2s'}} onClick={() => handleDeletePromo(promo.code)}>
                    O'chirish
                  </button>
                </div>
              </div>
            ))}
            {promocodes.length === 0 && !promoLoading && (
              <div className="empty-state" style={{gridColumn: '1 / -1'}}>Pramakodlar yo'q</div>
            )}
          </div>
        </div>
      )}

      {/* ==================== FRAGMENT COOKIE TAB (yashirin) ==================== */}
      {false && activeTab === "fragment-cookie" && (
        <div className="tab-content settings-tab fragment-cookie-tab">
          <h3 className="settings-section-title">🍪 Fragment cookie test</h3>
          <p className="settings-section-desc">
            Tekshiruv server <code>backend/.env</code> dagi <code>FRAGMENT_*</code>, <code>SEED</code>,{" "}
            <code>API_KEY</code>, <code>FRAGMENT_HTTP_PROXY</code> dan foydalanadi (standart manba: .env).
            Yetkazishda cookie odatda PostgreSQL <code>tokens</code> jadvalidan olinadi — ikkalasi mos bo‘lishi kerak.
          </p>

          <div className="fragment-env-grid">
            {fragmentEnvLoading && !fragmentEnvStatus && (
              <p className="settings-hint">⏳ .env holati yuklanmoqda...</p>
            )}
            {fragmentEnvStatus?.env && (
              <div className="fragment-env-card">
                <h4>📁 .env (maskalangan)</h4>
                <ul className="fragment-env-list">
                  <li>
                    <span>SEED</span>
                    <strong>{fragmentEnvStatus.env.has_seed ? "✅ bor" : "❌ yo‘q"}</strong>
                  </li>
                  <li>
                    <span>API_KEY</span>
                    <strong>{fragmentEnvStatus.env.has_api_key ? "✅ bor" : "❌ yo‘q"}</strong>
                  </li>
                  <li>
                    <span>DATABASE</span>
                    <strong>{fragmentEnvStatus.env.database_host}</strong>
                  </li>
                  <li>
                    <span>FRAGMENT_DT</span>
                    <strong>{fragmentEnvStatus.env.fragment_dt}</strong>
                  </li>
                  <li>
                    <span>FRAGMENT_SSID</span>
                    <strong>{fragmentEnvStatus.env.fragment_ssid}</strong>
                  </li>
                  <li>
                    <span>FRAGMENT_TOKEN</span>
                    <strong>{fragmentEnvStatus.env.fragment_token}</strong>
                  </li>
                  <li>
                    <span>FRAGMENT_TON_TOKEN</span>
                    <strong>{fragmentEnvStatus.env.fragment_ton_token}</strong>
                  </li>
                  <li>
                    <span>FRAGMENT_HTTP_PROXY</span>
                    <strong>
                      {fragmentEnvStatus.env.fragment_http_proxy ||
                        fragmentEnvStatus.proxy?.enabled
                          ? fragmentEnvStatus.env.fragment_http_proxy || fragmentEnvStatus.proxy?.url
                          : "(yo‘q)"}
                    </strong>
                  </li>
                </ul>
                <p className="settings-hint">
                  .env cookie: {fragmentEnvStatus.env_ready ? "✅ to‘liq" : "❌ ssid/token yo‘q"} · DB:{" "}
                  {fragmentEnvStatus.db_ready ? "✅ to‘liq" : "❌"} · Mos:{" "}
                  {fragmentEnvStatus.fingerprints_match ? "✅ ha" : "⚠️ farq bor"}
                </p>
              </div>
            )}
          </div>

          <div className="purchase-mode-settings" style={{ marginTop: "16px" }}>
            <h4 className="settings-section-title" style={{ fontSize: "15px" }}>
              Manba (tekshiruv)
            </h4>
            <div className="purchase-mode-switch purchase-mode-switch--large">
              <button
                type="button"
                className={`purchase-mode-btn ${fragmentTestSource === "env" ? "active frag" : ""}`}
                onClick={() => setFragmentTestSource("env")}
                disabled={fragmentTestLoading}
              >
                .env
              </button>
              <button
                type="button"
                className={`purchase-mode-btn ${fragmentTestSource === "db" ? "active robyn" : ""}`}
                onClick={() => setFragmentTestSource("db")}
                disabled={fragmentTestLoading}
              >
                PostgreSQL
              </button>
              <button
                type="button"
                className={`purchase-mode-btn ${fragmentTestSource === "auto" ? "active ton" : ""}`}
                onClick={() => setFragmentTestSource("auto")}
                disabled={fragmentTestLoading}
              >
                Auto
              </button>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
              <button
                type="button"
                className="add-package-btn"
                onClick={runFragmentCookieTest}
                disabled={fragmentTestLoading}
              >
                {fragmentTestLoading ? "⏳ Tekshirilmoqda..." : "🔍 Cookie test (HTTP)"}
              </button>
              <button
                type="button"
                className="add-package-btn"
                onClick={() => {
                  fetchFragmentEnvStatus();
                  fetchFragmentTokens();
                }}
                disabled={fragmentEnvLoading}
              >
                🔄 Yangilash
              </button>
              <button
                type="button"
                className="add-package-btn"
                onClick={verifyFragmentCookies}
                disabled={fragmentVerifyLoading}
              >
                {fragmentVerifyLoading ? "⏳..." : "🐍 Python verify"}
              </button>
            </div>
            {fragmentVerifyMsg && (
              <p style={{ marginTop: "8px", fontSize: "13px" }}>{fragmentVerifyMsg}</p>
            )}
          </div>

          {fragmentTestResult && (
            <div
              className={`fragment-test-result ${fragmentTestResult.ok ? "ok" : "fail"}`}
            >
              <div className="fragment-test-result-head">
                <strong>{fragmentTestResult.ok ? "✅ Cookie ishlayapti" : "❌ Xato"}</strong>
                {fragmentTestResult.status != null && (
                  <span>HTTP {fragmentTestResult.status}</span>
                )}
                {fragmentTestResult.token_source && (
                  <span>manba: {fragmentTestResult.token_source}</span>
                )}
                {fragmentTestResult.tor_port_9050 && (
                  <span>Tor 9050: {fragmentTestResult.tor_port_9050}</span>
                )}
              </div>
              {fragmentTestResult.error && (
                <p className="fragment-test-error">{fragmentTestResult.error}</p>
              )}
              {Array.isArray(fragmentTestResult.hints) && fragmentTestResult.hints.length > 0 && (
                <ul className="fragment-test-hints">
                  {fragmentTestResult.hints.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              )}
              <pre className="fragment-test-json">
                {JSON.stringify(fragmentTestResult, null, 2)}
              </pre>
            </div>
          )}

          <h3 className="settings-section-title" style={{ marginTop: "28px" }}>
            💾 Cookie (PostgreSQL tokens)
          </h3>
          <p className="settings-section-desc">
            Yetkazish vaqtida server shu jadvaldan o‘qiydi. .env bilan bir xil qiymatlarni qo‘ying yoki .env ni
            yangilab serverni qayta ishga tushiring.
          </p>
          <div className="settings-add-package" style={{ marginBottom: "24px" }}>
            <div className="package-form">
              <div className="form-row">
                <div className="form-group">
                  <label>fragment_dt</label>
                  <input
                    value={fragmentTokens.fragment_dt}
                    onChange={(e) =>
                      setFragmentTokens({ ...fragmentTokens, fragment_dt: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>fragment_ssid</label>
                  <input
                    value={fragmentTokens.fragment_ssid}
                    onChange={(e) =>
                      setFragmentTokens({ ...fragmentTokens, fragment_ssid: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>fragment_token</label>
                  <input
                    value={fragmentTokens.fragment_token}
                    onChange={(e) =>
                      setFragmentTokens({ ...fragmentTokens, fragment_token: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>fragment_ton_token</label>
                  <input
                    value={fragmentTokens.fragment_ton_token}
                    onChange={(e) =>
                      setFragmentTokens({
                        ...fragmentTokens,
                        fragment_ton_token: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
                <button
                  type="button"
                  className="add-package-btn"
                  onClick={saveFragmentTokens}
                  disabled={fragmentTokensLoading}
                >
                  {fragmentTokensLoading ? "⏳..." : "💾 DB ga saqlash"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SETTINGS TAB ==================== */}
      {activeTab === "settings" && (
        <div className="tab-content settings-tab">
          <h3 className="settings-section-title">⚡ Stars / Premium yetkazish</h3>
          <p className="settings-section-desc">
            Dashboard dagi &quot;Stars olish&quot; va &quot;Premium olish&quot; tugmalari qaysi sahifaga ochilishini tanlang.
          </p>
          <div className="purchase-mode-settings">
            <div className="purchase-mode-switch purchase-mode-switch--large">
              <button
                type="button"
                className={`purchase-mode-btn ${starsPurchaseMode === "robynhood" ? "active robyn" : ""}`}
                onClick={() => setPurchaseMode("robynhood")}
                disabled={purchaseModeLoading}
              >
                RobynHood
              </button>
              <button
                type="button"
                className={`purchase-mode-btn ${starsPurchaseMode === "fragment" ? "active frag" : ""}`}
                onClick={() => setPurchaseMode("fragment")}
                disabled={purchaseModeLoading}
              >
                Fragment (USDT)
              </button>
              <button
                type="button"
                className={`purchase-mode-btn ${starsPurchaseMode === "paymee" ? "active paymee" : ""}`}
                onClick={() => setPurchaseMode("paymee")}
                disabled={purchaseModeLoading}
              >
                Paymee API
              </button>
            </div>
            <p className="settings-hint">
              {starsPurchaseMode === "fragment"
                ? "Hozir: /usdtstars va /usdtpremium (karta + Fragment)"
                : starsPurchaseMode === "paymee"
                  ? "Hozir: /paymeestars va /paymeepremium (karta + StarsPaymee Partner API)"
                  : "Hozir: /stars va /premium (RobynHood API)"}
            </p>
          </div>

          {starsPurchaseMode === "fragment" && (
            <div className="purchase-mode-settings">
              <h3 className="settings-section-title">💰 Fragment to‘lov usuli</h3>
              <p className="settings-section-desc">
                Fragment hamyonidan stars/premium yuborish: native TON yoki USDT TON.
              </p>
              <div className="purchase-mode-switch purchase-mode-switch--large">
                <button
                  type="button"
                  className={`purchase-mode-btn ${fragmentPaymentMethod === "ton" ? "active ton" : ""}`}
                  onClick={() => setFragmentPayMethod("ton")}
                  disabled={fragmentPayLoading}
                >
                  TON
                </button>
                <button
                  type="button"
                  className={`purchase-mode-btn ${fragmentPaymentMethod === "usdt_ton" ? "active usdt" : ""}`}
                  onClick={() => setFragmentPayMethod("usdt_ton")}
                  disabled={fragmentPayLoading}
                >
                  USDT TON
                </button>
              </div>
              <p className="settings-hint">
                Faol: <strong>{fragmentPaymentMethod === "usdt_ton" ? "USDT TON" : "TON"}</strong> — /usdtstars va /usdtpremium uchun
              </p>
            </div>
          )}

          <h3 className="settings-section-title">🏷️ Chegirma Paketlari</h3>
          <p className="settings-section-desc">Maxsus chegirmali Stars paketlarini boshqaring</p>

          {/* Add New Package */}
          <div className="settings-add-package">
            <div className="package-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Stars miqdori</label>
                  <input
                    type="number"
                    placeholder="500"
                    value={newPackage.stars}
                    onChange={(e) => setNewPackage({ ...newPackage, stars: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Chegirma (%)</label>
                  <input
                    type="number"
                    placeholder="10"
                    max="50"
                    min="1"
                    value={newPackage.discount_percent}
                    onChange={(e) => setNewPackage({ ...newPackage, discount_percent: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Narxi (avto)</label>
                  <input
                    type="text"
                    readOnly
                    value={calculateDiscountedPrice(newPackage.stars, newPackage.discount_percent).toLocaleString() + " so'm"}
                  />
                </div>
              </div>
              <div className="form-info">
                <small>
                  Asl narx: {(parseInt(newPackage.stars || 0) * BASE_PRICE).toLocaleString()} so'm 
                  | Chegirma: {((parseInt(newPackage.stars || 0) * BASE_PRICE) - calculateDiscountedPrice(newPackage.stars, newPackage.discount_percent)).toLocaleString()} so'm
                </small>
              </div>
              <button 
                className="add-package-btn"
                onClick={addDiscountPackage}
                disabled={packageLoading || !newPackage.stars || !newPackage.discount_percent}
              >
                {packageLoading ? "⏳ Yuklanmoqda..." : "➕ Paket qo'shish"}
              </button>
            </div>
          </div>

          {/* Existing Packages */}
          <div className="packages-list">
            <h4>Mavjud paketlar ({discountPackages.length} ta)</h4>
            {loading ? (
              <div className="loading-text">⏳ Yuklanmoqda...</div>
            ) : discountPackages.length === 0 ? (
              <div className="empty-text">Hech qanday paket yo'q</div>
            ) : (
              <div className="packages-grid">
                {discountPackages.map((pkg) => (
                  <div key={pkg.id} className={`package-item ${!pkg.is_active ? "inactive" : ""}`}>
                    <div className="package-header">
                      <span className="package-stars">⭐ {pkg.stars.toLocaleString()}</span>
                      <span className={`package-status ${pkg.is_active ? "active" : "inactive"}`}>
                        {pkg.is_active ? "✅ Faol" : "⏸️ O'chirilgan"}
                      </span>
                    </div>
                    <div className="package-details">
                      <div className="detail-row">
                        <span className="label">Chegirma:</span>
                        <span className="value discount">-{pkg.discount_percent}%</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Narx:</span>
                        <span className="value price">{pkg.discounted_price.toLocaleString()} so'm</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Asl narx:</span>
                        <span className="value original">{(pkg.stars * BASE_PRICE).toLocaleString()} so'm</span>
                      </div>
                    </div>
                    <div className="package-actions">
                      <button
                        className={`toggle-btn ${pkg.is_active ? "deactivate" : "activate"}`}
                        onClick={() => togglePackageActive(pkg.id, pkg.is_active)}
                      >
                        {pkg.is_active ? "⏸️ O'chirish" : "▶️ Yoqish"}
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => deleteDiscountPackage(pkg.id)}
                      >
                        🗑️ O'chirish
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== REFERRALS TAB ==================== */}
      {activeTab === "referrals" && (
        <div className="tab-content referrals-tab">
          
          <p className="settings-section-desc">Foydalanuvchilarning referral so'rovlarini tasdiqlang yoki rad qiling</p>

          {/* Filter Buttons */}
          <div className="referrals-filter" style={{display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap'}}>
            {['pending', 'accepted', 'rejected', 'all'].map(f => (
              <button
                key={f}
                onClick={() => {
                  setReferralFilter(f);
                  fetchReferralRequests(f);
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: referralFilter === f ? '#667eea' : 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: referralFilter === f ? '600' : '500',
                  transition: 'all 0.2s ease',
                  fontSize: '13px',
                  fontFamily: 'monospace'
                }}
              >
                {f === 'pending' ? `pending: ${referralRequests.filter(r => !r.is_accepted && !r.rejected_at).length}` : 
                 f === 'accepted' ? `accept: ${referralRequests.filter(r => r.is_accepted).length}` :
                 f === 'rejected' ? `refuse: ${referralRequests.filter(r => r.rejected_at).length}` :
                 `all: ${referralRequests.length}`}
              </button>
            ))}
          </div>

          {/* Requests List */}
          <div className="referrals-list" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px'}}>
            {referralLoading ? (
              <div style={{textAlign: 'center', padding: '20px', color: '#999', gridColumn: '1 / -1'}}>⏳ Yuklanmoqda...</div>
            ) : referralRequests.length === 0 ? (
              <div style={{textAlign: 'center', padding: '20px', color: '#999', gridColumn: '1 / -1'}}>Hech qanday so'rov topilmadi</div>
            ) : (
              referralRequests.map(req => (
                <div
                  key={req.id}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                  }}
                >
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px'}}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '15px', flexWrap: 'wrap' }}>
                        <span style={{color: '#f9a825', fontWeight: 'bold'}}>@{req.referrer_username || 'user'}</span>
                        <span style={{color: 'rgba(255,255,255,0.4)'}}>{'->'}</span>
                        <span style={{color: '#4ee0ff', fontWeight: 'bold'}}>@{req.owner_username || 'new_user'}</span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <span style={{
                          fontSize: '11px',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          backgroundColor: req.subscribe_referrer ? 'rgba(52,199,89,0.15)' : 'rgba(255,69,58,0.15)',
                          color: req.subscribe_referrer ? '#34c759' : '#ff453a',
                          fontWeight: '600',
                          border: `1px solid ${req.subscribe_referrer ? 'rgba(52,199,89,0.3)' : 'rgba(255,69,58,0.3)'}`
                        }}>
                          {req.subscribe_referrer ? '✅ Obuna bo\'lgan' : '❌ Kanalga obuna bo\'lmagan'}
                        </span>
                        
                        <span style={{
                          fontSize: '11px',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          backgroundColor: req.is_accepted ? 'rgba(52,199,89,0.15)' : req.rejected_at ? 'rgba(255,69,58,0.15)' : 'rgba(255,204,0,0.15)',
                          color: req.is_accepted ? '#34c759' : req.rejected_at ? '#ff453a' : '#ffcc00',
                          fontWeight: '600',
                          border: `1px solid ${req.is_accepted ? 'rgba(52,199,89,0.3)' : req.rejected_at ? 'rgba(255,69,58,0.3)' : 'rgba(255,204,0,0.3)'}`
                        }}>
                          {req.is_accepted ? 'Tasdiqlangan' : req.rejected_at ? 'Rad etilgan' : 'Kutilmoqda'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{fontSize: '12px', color: 'rgba(255,255,255,0.5)'}}>
                    📅 {new Date(req.created_at).toLocaleDateString('uz-UZ')} {new Date(req.created_at).toLocaleTimeString('uz-UZ', {hour: '2-digit', minute: '2-digit'})}
                  </div>

                  {/* Action Buttons */}
                  {!req.is_accepted && !req.rejected_at && (
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)'}}>
                      <button
                        onClick={() => approveReferral(req.id)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                          color: '#fff',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        ✅ Tasdiqlash
                      </button>
                      <button
                        onClick={() => rejectReferral(req.id)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #ff4444, #cc0000)',
                          color: '#fff',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        ❌ Rad qilish
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== USER DETAILS MODAL ==================== */}
      {userModal && userDetailsModalType === "info" && (
        <div className="balance-modal-overlay" onClick={() => { 
          setUserModal(null); 
          setUserDetailsModalType(null);
          setSelectedUserCard(null);
        }}>
          <div className="balance-modal user-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="balance-modal-header">
              <h3>👤 Foydalanuvchi ma'lumotlari</h3>
              <button className="modal-close" onClick={() => { 
                setUserModal(null); 
                setUserDetailsModalType(null);
                setSelectedUserCard(null);
              }}>✕</button>
            </div>
            
            <div className="balance-modal-body">
              <div className="user-detail-section">
                <div className="user-detail-row">
                  <span className="detail-label">ID:</span>
                  <span className="detail-value">#{userModal.id}</span>
                </div>
                <div className="user-detail-row">
                  <span className="detail-label">Ism:</span>
                  <span className="detail-value">{userModal.name || "-"}</span>
                </div>
                <div className="user-detail-row">
                  <span className="detail-label">Username:</span>
                  <span className="detail-value highlight">@{userModal.username}</span>
                </div>
                <div className="user-detail-row">
                  <span className="detail-label">Telegram ID:</span>
                  <span className="detail-value">{userModal.user_id || "-"}</span>
                </div>
                <div className="user-detail-row">
                  <span className="detail-label">Referral Code:</span>
                  <span className="detail-value" style={{fontFamily: 'monospace'}}>{userModal.referral_code || "-"}</span>
                </div>
                <div className="user-detail-row">
                  <span className="detail-label">Referrer ID:</span>
                  <span className="detail-value">{userModal.referrer_user_id || "-"}</span>
                </div>
                {referrerInfo && (
                  <div className="user-detail-row" style={{background: 'rgba(102, 126, 234, 0.1)', padding: '8px', borderRadius: '6px', margin: '4px 0'}}>
                    <span className="detail-label">Oldin'dan:</span>
                    <span className="detail-value" style={{color: '#667eea'}}>@{referrerInfo.username}</span>
                  </div>
                )}
                <div className="user-detail-row">
                  <span className="detail-label">Ref Balance:</span>
                  <span className="detail-value highlight">💰 {userModal.referral_balance || 0} ⭐</span>
                </div>
                <div className="user-detail-row">
                  <span className="detail-label">Total Earnings:</span>
                  <span className="detail-value">{userModal.total_earnings || 0} ⭐</span>
                </div>
                <div className="user-detail-row">
                  <span className="detail-label">Total Referrals:</span>
                  <span className="detail-value">👥 {userModal.total_referrals || 0}</span>
                </div>
                <div className="user-detail-row">
                  <span className="detail-label">Obuna:</span>
                  <span className="detail-value">{userModal.subscribe_user ? "✅ Ha" : "❌ Yo'q"}</span>
                </div>
                <div className="user-detail-row">
                  <span className="detail-label">Til:</span>
                  <span className="detail-value">{userModal.language || "uz"}</span>
                </div>
                <div className="user-detail-row">
                  <span className="detail-label">Ro'yxatdan o'tgan:</span>
                  <span className="detail-value">{new Date(userModal.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="user-detail-actions">
                <button
                  className="balance-btn add"
                  onClick={() => {
                    setUserModal(null);
                    setUserDetailsModalType(null);
                    openBalanceModal(userModal);
                  }}
                >
                  ➕➖ Referral balansni o'zgartirish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {userModal && userDetailsModalType === "referrals" && (
        <div className="balance-modal-overlay" onClick={() => { 
          setUserModal(null); 
          setUserDetailsModalType(null);
          setSelectedUserCard(null);
        }}>
          <div className="balance-modal user-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="balance-modal-header">
              <h3>👥 @{userModal.username} ning referallari</h3>
              <button className="modal-close" onClick={() => { 
                setUserModal(null); 
                setUserDetailsModalType(null);
                setSelectedUserCard(null);
              }}>✕</button>
            </div>
            
            <div className="balance-modal-body">
              {referralsLoading ? (
                <div style={{textAlign: 'center', padding: '20px'}}>
                  <div className="loading-spinner"></div>
                  <p>Referrallar yuklanmoqda...</p>
                </div>
              ) : userReferrals && userReferrals.length > 0 ? (
                <div className="referrals-section">
                  <h4 style={{marginBottom: '12px', color: '#667eea'}}>👥 Jami: {userReferrals.length} ta</h4>
                  <div className="referrals-list" style={{maxHeight: '400px', overflowY: 'auto'}}>
                    {userReferrals.map((ref) => (
                      <div 
                        key={ref.id} 
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px',
                          marginBottom: '8px',
                          background: 'rgba(255,255,255,0.05)',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      >
                        <div style={{flex: 1}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <span style={{color: '#667eea', fontWeight: 'bold'}}>@{ref.username}</span>
                            <span style={{color: 'rgba(255,255,255,0.6)'}}>
                              Sub: {ref.subscribe_user ? "✅" : "❌"}
                            </span>
                          </div>
                          <div style={{color: '#999', fontSize: '11px', marginTop: '4px'}}>
                            📅 {new Date(ref.created_at).toLocaleDateString('uz-UZ')}
                          </div>
                        </div>
                        <button
                          className="delete-btn"
                          onClick={() => removeReferral(ref.id)}
                          style={{
                            background: '#ff4757',
                            border: 'none',
                            color: 'white',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            marginLeft: '8px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          🗑️ O'chirish
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{textAlign: 'center', padding: '40px 20px', color: '#999'}}>
                  <div style={{fontSize: '24px', marginBottom: '8px'}}>👥</div>
                  <p>Hech qanday referral yo'q</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== BALANCE ADJUSTMENT MODAL ==================== */}
      {balanceModal && (
        <div className="balance-modal-overlay" onClick={() => setBalanceModal(null)}>
          <div className="balance-modal" onClick={(e) => e.stopPropagation()}>
            <div className="balance-modal-header">
              <h3>💰 Balans o'zgartirish</h3>
              <button className="modal-close" onClick={() => setBalanceModal(null)}>✕</button>
            </div>
            
            <div className="balance-modal-body">
              <div className="balance-user-info">
                <span className="balance-username">@{balanceModal.username}</span>
                <span className="balance-current">Joriy balans: <b>{balanceModal.currentBalance} ⭐</b></span>
              </div>

              <div className="balance-input-group">
                <label>Miqdor</label>
                <input
                  type="number"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  placeholder="Miqdorni kiriting..."
                  min="1"
                  disabled={balanceLoading}
                />
              </div>

              <div className="balance-actions">
                <button 
                  className="balance-btn add"
                  onClick={() => adjustBalance("add")}
                  disabled={balanceLoading || !balanceAmount}
                >
                  {balanceLoading ? "⏳" : "➕"} Qo'shish
                </button>
                <button 
                  className="balance-btn subtract"
                  onClick={() => adjustBalance("subtract")}
                  disabled={balanceLoading || !balanceAmount}
                >
                  {balanceLoading ? "⏳" : "➖"} Ayirish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ==================== SOM BALANCE ADJUSTMENT MODAL ==================== */}
      {somBalanceModal && (
        <div className="balance-modal-overlay" onClick={() => setSomBalanceModal(null)}>
          <div className="balance-modal" onClick={(e) => e.stopPropagation()}>
            <div className="balance-modal-header">
              <h3>💵 Som balans o'zgartirish</h3>
              <button className="modal-close" onClick={() => setSomBalanceModal(null)}>✕</button>
            </div>

            <div className="balance-modal-body">
              <div className="balance-user-info">
                <span className="balance-username">@{somBalanceModal.username}</span>
                <span className="balance-current">Joriy balans: <b>{somBalanceModal.currentBalance.toLocaleString()} so'm</b></span>
              </div>

              <div className="balance-input-group">
                <label>Miqdor (so'm)</label>
                <input
                  type="number"
                  value={somBalanceAmount}
                  onChange={(e) => setSomBalanceAmount(e.target.value)}
                  placeholder="Miqdorni kiriting..."
                  min="1"
                  disabled={somBalanceLoading}
                />
              </div>

              <div className="balance-actions">
                <button
                  className="balance-btn add"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                  onClick={() => adjustSomBalance("add")}
                  disabled={somBalanceLoading || !somBalanceAmount}
                >
                  {somBalanceLoading ? "⏳" : "➕"} Qo'shish
                </button>
                <button
                  className="balance-btn subtract"
                  onClick={() => adjustSomBalance("subtract")}
                  disabled={somBalanceLoading || !somBalanceAmount}
                >
                  {somBalanceLoading ? "⏳" : "➖"} Ayirish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>

      {/* Mobil: qo'shimcha bo'limlar — eng pastda */}
      <nav className="admin-bottom-nav admin-bottom-nav--secondary" aria-label="Qo'shimcha bo'limlar">
        {SECONDARY_NAV_BOTTOM.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`bottom-nav-item ${activeTab === item.id ? "active" : ""}`}
            onClick={() => goToTab(item.id)}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
            {item.id === "referrals" &&
              referralRequests.filter((r) => !r.is_accepted && !r.rejected_at).length > 0 && (
                <span className="bottom-nav-badge">
                  {referralRequests.filter((r) => !r.is_accepted && !r.rejected_at).length}
                </span>
              )}
          </button>
        ))}
      </nav>

      {manualPremiumModal && (
        <div
          className="balance-modal-overlay admin-premium-modal-overlay"
          onClick={closeManualPremiumModal}
          role="presentation"
        >
          <div
            className="balance-modal admin-premium-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-premium-modal-title"
          >
            <div
              className={`balance-modal-header admin-premium-modal-header ${
                manualPremiumModal === "1_oy"
                  ? "admin-premium-modal-header--month"
                  : "admin-premium-modal-header--year"
              }`}
            >
              <h3 id="admin-premium-modal-title">
                {manualPremiumModal === "1_oy" ? "1 oylik Premium" : "1 yillik Premium"}
              </h3>
              <button
                type="button"
                className="modal-close"
                onClick={closeManualPremiumModal}
                aria-label="Yopish"
              >
                ✕
              </button>
            </div>

            <div className="balance-modal-body admin-premium-modal-body">
              <p className="admin-premium-modal-sum">
                To&apos;lov summasi:{" "}
                <b>{manualPremiumModal === "1_oy" ? "57 000" : "320 000"} so&apos;m</b>
              </p>
              <label className="admin-premium-modal-field">
                <span>Qabul qiluvchi username</span>
                <input
                  type="text"
                  value={manualPremiumUsername}
                  onChange={(e) => setManualPremiumUsername(e.target.value)}
                  placeholder="@username"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && manualPremiumUsername.trim() && !manualPremiumLoading) {
                      createManualPremiumOrder();
                    }
                  }}
                />
              </label>
            </div>

            <div className="admin-premium-modal-footer">
              <button
                type="button"
                className="admin-premium-modal-btn admin-premium-modal-btn--ghost"
                onClick={closeManualPremiumModal}
                disabled={manualPremiumLoading}
              >
                Bekor qilish
              </button>
              <button
                type="button"
                className={`admin-premium-modal-btn admin-premium-modal-btn--primary ${
                  manualPremiumModal === "1_yil" ? "admin-premium-modal-btn--year" : ""
                }`}
                onClick={createManualPremiumOrder}
                disabled={manualPremiumLoading || !manualPremiumUsername.trim()}
              >
                {manualPremiumLoading ? "Yaratilmoqda..." : "Order yaratish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
