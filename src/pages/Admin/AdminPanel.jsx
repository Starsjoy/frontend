import React, { useEffect, useState } from "react";
import "./AdminPanel.css";
import { TGSSticker } from "../../components/TGSSticker";
import adminSticker from "../../assets/AnimatedSticker_admin.tgs";
import apiFetch from "../../utils/apiFetch";

// ========== FOYDA HISOBLASH KONSTANTALARI ==========
const PROFIT_CONFIG = {
  // Stars: 50 stars = 9500 (tannarx) → 12000 (sotish) = 2500 foyda
  // 1 star = 50 UZS foyda
  STARS_PROFIT_PER_UNIT: 50,
  
  // Premium: Tannarx → Sotish narxi → Foyda
  PREMIUM_COST: { 3: 152000, 6: 203000, 12: 367000 },
  PREMIUM_SELL: { 3: 172000, 6: 232000, 12: 422000 },
  PREMIUM_PROFIT: { 3: 20000, 6: 29000, 12: 55000 },
  
  // Gift: Stars foydasiga teng (stars × 50 UZS)
  // 15 stars = 750, 25 stars = 1250, 50 stars = 2500, 100 stars = 5000
  GIFT_PROFIT_PER_STAR: 50
};

// Foyda hisoblash funksiyalari
const calculateStarsProfit = (stars) => stars * PROFIT_CONFIG.STARS_PROFIT_PER_UNIT;
const calculatePremiumProfit = (months) => PROFIT_CONFIG.PREMIUM_PROFIT[months] || 0;
const calculateGiftProfit = (stars) => stars * PROFIT_CONFIG.GIFT_PROFIT_PER_STAR;

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
    failed: 0,
    error: 0,
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // Users state
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("transactions");
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

  // 🔧 Maintenance mode
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

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
    completed: 0,
    expired: 0,
    failed: 0
  });
  const [premiumShowAll, setPremiumShowAll] = useState(false);

  // Gift orders state
  const [giftOrders, setGiftOrders] = useState([]);
  const [giftExpandedId, setGiftExpandedId] = useState(null);
  const [giftFilter, setGiftFilter] = useState("all");
  const [giftStats, setGiftStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    expired: 0,
    failed: 0
  });
  const [giftShowAll, setGiftShowAll] = useState(false);

  // Analytics state
  const [analyticsPeriod, setAnalyticsPeriod] = useState("all"); // day, week, month, all
  const [analyticsData, setAnalyticsData] = useState({
    stars: { count: 0, totalStars: 0, totalAmount: 0, profit: 0 },
    premium: { count: 0, totalAmount: 0, profit: 0, byMonths: { 3: 0, 6: 0, 12: 0 } },
    gift: { count: 0, totalStars: 0, totalAmount: 0, profit: 0 },
    total: { count: 0, totalAmount: 0, totalProfit: 0 }
  });
  const [dailyStats, setDailyStats] = useState([]); // [{date, stars, amount, count, profit}]
  const [periodStats, setPeriodStats] = useState({
    today: { revenue: 0, profit: 0, count: 0 },
    week: { revenue: 0, profit: 0, count: 0 },
    month: { revenue: 0, profit: 0, count: 0 },
    all: { revenue: 0, profit: 0, count: 0 }
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Wallet & Prices state
  const [walletBalance, setWalletBalance] = useState({ mainnet: 0, testnet: 0 });
  const [starPrices, setStarPrices] = useState({ priceFor50: 0, pricePerStar: 0, currency: "TON", availableStars: 0 });
  const [walletLoading, setWalletLoading] = useState(false);
  const [botStarsBalance, setBotStarsBalance] = useState(0);

  // Discount packages state
  const [discountPackages, setDiscountPackages] = useState([]);
  const [newPackage, setNewPackage] = useState({ stars: "", discount_percent: "" });
  const [packageLoading, setPackageLoading] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const BASE_PRICE = parseInt(import.meta.env.VITE_NARX) || 240;

  // ========== MAINTENANCE MODE ==========
  useEffect(() => {
    if (!isAuthenticated) return;
    apiFetch("/api/maintenance")
      .then(r => r.json())
      .then(d => setMaintenanceMode(d.maintenance))
      .catch(() => {});
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
      if (data.success) {
        setMaintenanceMode(data.maintenance);
      }
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
      const [walletRes, botStarsRes] = await Promise.all([
        apiFetch("/api/admin/wallet-info"),
        apiFetch("/api/admin/bot-stars-balance")
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

  // Fetch wallet when analytics tab is active
  useEffect(() => {
    if (activeTab === "analytics" && isAuthenticated) {
      fetchWalletAndPrices();
    }
  }, [activeTab, isAuthenticated]);

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

      // Filter by date and completed status only
      const filterByDate = (items, dateField = "created_at") => {
        if (!startDate) return items;
        return items.filter(item => new Date(item[dateField]) >= startDate);
      };

      const completedStarsAll = starsData.filter(tx => tx.status === "completed");
      const completedPremiumAll = premiumData.filter(tx => tx.status === "completed");
      const completedGiftAll = giftData.filter(tx => tx.status === "completed");

      const filteredStars = filterByDate(completedStarsAll);
      const filteredPremium = filterByDate(completedPremiumAll);
      const filteredGift = filterByDate(completedGiftAll);

      // ========== STARS ANALYTICS ==========
      const starsStats = {
        count: filteredStars.length,
        totalStars: filteredStars.reduce((sum, tx) => sum + (tx.stars || 0), 0),
        totalAmount: filteredStars.reduce((sum, tx) => sum + (tx.amount || 0), 0),
        profit: filteredStars.reduce((sum, tx) => sum + calculateStarsProfit(tx.stars || 0), 0)
      };

      // ========== PREMIUM ANALYTICS ==========
      const premiumByMonths = { 3: 0, 6: 0, 12: 0 };
      let premiumProfit = 0;
      filteredPremium.forEach(tx => {
        const months = tx.months || tx.type_amount || 3;
        if (premiumByMonths[months] !== undefined) {
          premiumByMonths[months]++;
        }
        premiumProfit += calculatePremiumProfit(months);
      });

      const premiumStats = {
        count: filteredPremium.length,
        totalAmount: filteredPremium.reduce((sum, tx) => sum + (tx.amount || 0), 0),
        profit: premiumProfit,
        byMonths: premiumByMonths
      };

      // ========== GIFT ANALYTICS ==========
      const giftStats = {
        count: filteredGift.length,
        totalStars: filteredGift.reduce((sum, tx) => sum + (tx.stars || 0), 0),
        totalAmount: filteredGift.reduce((sum, tx) => sum + (tx.amount || 0), 0),
        profit: filteredGift.reduce((sum, tx) => sum + calculateGiftProfit(tx.stars || 0), 0)
      };

      // ========== TOTAL ==========
      const totalProfit = starsStats.profit + premiumStats.profit + giftStats.profit;

      setAnalyticsData({
        stars: starsStats,
        premium: premiumStats,
        gift: giftStats,
        total: {
          count: starsStats.count + premiumStats.count + giftStats.count,
          totalAmount: starsStats.totalAmount + premiumStats.totalAmount + giftStats.totalAmount,
          totalProfit: totalProfit
        }
      });

      // ========== PERIOD STATS (Today, Week, Month, All) ==========
      const calculatePeriodProfit = (stars, premium, gifts) => {
        let profit = 0;
        profit += stars.reduce((sum, tx) => sum + calculateStarsProfit(tx.stars || 0), 0);
        profit += premium.reduce((sum, tx) => sum + calculatePremiumProfit(tx.months || tx.type_amount || 3), 0);
        profit += gifts.reduce((sum, tx) => sum + calculateGiftProfit(tx.stars || 0), 0);
        return profit;
      };

      const calculatePeriodRevenue = (stars, premium, gifts) => {
        return stars.reduce((s, tx) => s + (tx.amount || 0), 0) +
               premium.reduce((s, tx) => s + (tx.amount || 0), 0) +
               gifts.reduce((s, tx) => s + (tx.amount || 0), 0);
      };

      // Today
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayStars = completedStarsAll.filter(tx => new Date(tx.created_at) >= todayStart);
      const todayPremium = completedPremiumAll.filter(tx => new Date(tx.created_at) >= todayStart);
      const todayGift = completedGiftAll.filter(tx => new Date(tx.created_at) >= todayStart);

      // Week
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekStars = completedStarsAll.filter(tx => new Date(tx.created_at) >= weekStart);
      const weekPremium = completedPremiumAll.filter(tx => new Date(tx.created_at) >= weekStart);
      const weekGift = completedGiftAll.filter(tx => new Date(tx.created_at) >= weekStart);

      // Month
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthStars = completedStarsAll.filter(tx => new Date(tx.created_at) >= monthStart);
      const monthPremium = completedPremiumAll.filter(tx => new Date(tx.created_at) >= monthStart);
      const monthGift = completedGiftAll.filter(tx => new Date(tx.created_at) >= monthStart);

      setPeriodStats({
        today: {
          revenue: calculatePeriodRevenue(todayStars, todayPremium, todayGift),
          profit: calculatePeriodProfit(todayStars, todayPremium, todayGift),
          count: todayStars.length + todayPremium.length + todayGift.length
        },
        week: {
          revenue: calculatePeriodRevenue(weekStars, weekPremium, weekGift),
          profit: calculatePeriodProfit(weekStars, weekPremium, weekGift),
          count: weekStars.length + weekPremium.length + weekGift.length
        },
        month: {
          revenue: calculatePeriodRevenue(monthStars, monthPremium, monthGift),
          profit: calculatePeriodProfit(monthStars, monthPremium, monthGift),
          count: monthStars.length + monthPremium.length + monthGift.length
        },
        all: {
          revenue: calculatePeriodRevenue(completedStarsAll, completedPremiumAll, completedGiftAll),
          profit: calculatePeriodProfit(completedStarsAll, completedPremiumAll, completedGiftAll),
          count: completedStarsAll.length + completedPremiumAll.length + completedGiftAll.length
        }
      });

      // ========== DAILY BREAKDOWN (Last 7 days with profit) ==========
      const dailyMap = {};
      
      // Get last 7 days
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        dailyMap[key] = { date: key, stars: 0, amount: 0, count: 0, profit: 0, starsCount: 0, premiumCount: 0, giftCount: 0 };
      }

      // Aggregate Stars
      completedStarsAll.forEach(tx => {
        const txDate = new Date(tx.created_at).toISOString().split('T')[0];
        if (dailyMap[txDate]) {
          dailyMap[txDate].stars += tx.stars || 0;
          dailyMap[txDate].amount += tx.amount || 0;
          dailyMap[txDate].count += 1;
          dailyMap[txDate].starsCount += 1;
          dailyMap[txDate].profit += calculateStarsProfit(tx.stars || 0);
        }
      });

      // Aggregate Premium
      completedPremiumAll.forEach(tx => {
        const txDate = new Date(tx.created_at).toISOString().split('T')[0];
        if (dailyMap[txDate]) {
          dailyMap[txDate].amount += tx.amount || 0;
          dailyMap[txDate].count += 1;
          dailyMap[txDate].premiumCount += 1;
          dailyMap[txDate].profit += calculatePremiumProfit(tx.months || tx.type_amount || 3);
        }
      });

      // Aggregate Gift
      completedGiftAll.forEach(tx => {
        const txDate = new Date(tx.created_at).toISOString().split('T')[0];
        if (dailyMap[txDate]) {
          dailyMap[txDate].stars += tx.stars || 0;
          dailyMap[txDate].amount += tx.amount || 0;
          dailyMap[txDate].count += 1;
          dailyMap[txDate].giftCount += 1;
          dailyMap[txDate].profit += calculateGiftProfit(tx.stars || 0);
        }
      });

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
            completed: orders.filter(o => o.status === 'completed').length,
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
    } else if (activeTab === "notifications") {
      fetchNotifications();
    }
  }, [filter, activeTab, isAuthenticated, premiumFilter, giftFilter]);

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

  // Premium order send
  const sendPremium = async (id) => {
    try {
      if (!window.confirm("💎 Ushbu buyurtmaga premium yuborilsinmi?")) return;

      const res = await apiFetch(`/api/admin/premium/resend/${id}`, {
        method: "POST",
      });

      const data = await res.json();

      if (data.success) {
        alert("💎 Premium yuborildi!");
        fetchPremiumOrders();
        setPremiumExpandedId(null);
      } else {
        alert("❌ Xato: " + data.error);
      }
    } catch (err) {
      console.error("❌ Premium yuborishda xato:", err);
      alert("Server xato!");
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

  const sendStars = async (id) => {
    try {
      if (!window.confirm("⭐ Ushbu buyurtmaga stars yuborilsinmi?")) return;

      const res = await apiFetch(`/api/admin/stars/send/${id}`, {
        method: "POST",
      });

      const data = await res.json();

      if (data.success) {
        alert("🌟 Stars yuborildi!");
        fetchTransactions();
        setExpandedId(null);
      } else {
        alert("❌ Xato: " + data.error);
      }
    } catch (err) {
      console.error("❌ Stars yuborishda xato:", err);
      alert("Server xato!");
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

  // Gift order send
  const sendGift = async (id) => {
    try {
      if (!window.confirm("🎁 Ushbu buyurtmaga gift yuborilsinmi?")) return;

      const res = await apiFetch(`/api/admin/gift/send/${id}`, {
        method: "POST",
      });

      const data = await res.json();

      if (data.success) {
        alert("🎁 Gift yuborildi!");
        fetchGiftOrders();
        setGiftExpandedId(null);
      } else {
        alert("❌ Xato: " + data.error);
      }
    } catch (err) {
      console.error("❌ Gift yuborishda xato:", err);
      alert("Server xato!");
    }
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
      failed: "#c0392b",
      error: "#8e44ad",
      // Backward compatibility
      stars_sent: "#27ae60",
      premium_sent: "#27ae60",
      gift_sent: "#27ae60",
      delivered: "#27ae60"
    };
    return colors[status] || "#95a5a6";
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: "⏳",
      completed: "✅",
      expired: "❌",
      failed: "⚠️",
      error: "🔴",
      // Backward compatibility
      stars_sent: "✅",
      premium_sent: "✅",
      gift_sent: "✅",
      delivered: "✅"
    };
    return icons[status] || "❓";
  };

  return (
    <div className="admin-panel-new">
      {/* Header with controls */}
      <header className="admin-header-v2">
        <div className="header-top">
          <h1>⚡ Admin</h1>
          <div className="header-right">
            {/* Compact site switch */}
            <div className={`site-mini ${maintenanceMode ? 'off' : 'on'}`}>
              <span className="site-dot"></span>
              <span className="site-txt">{maintenanceMode ? 'OFF' : 'ON'}</span>
              <button className="site-toggle" onClick={toggleMaintenance} disabled={maintenanceLoading}>
                <span className={`toggle-track ${maintenanceMode ? 'active' : ''}`}>
                  <span className="toggle-thumb"></span>
                </span>
              </button>
            </div>
            {/* Refresh */}
            <button className="hdr-btn refresh" onClick={() => {
              if (activeTab === "transactions") fetchTransactions();
              else if (activeTab === "users") fetchUsers();
              else if (activeTab === "premium") fetchPremiumOrders();
              else if (activeTab === "gift") fetchGiftOrders();
              else if (activeTab === "settings") fetchDiscountPackages();
              else if (activeTab === "analytics") { fetchAnalytics(); fetchWalletAndPrices(); }
            }}>
              🔄
            </button>
          </div>
        </div>
        <div className="header-btns">
          <button 
            className={`hdr-nav-btn ${activeTab === "analytics" ? "active" : ""}`}
            onClick={() => setActiveTab(activeTab === "analytics" ? "transactions" : "analytics")}
          >
            📊 Analitika
          </button>
          <button 
            className={`hdr-nav-btn ${activeTab === "notifications" ? "active" : ""}`}
            onClick={() => setActiveTab("notifications")}
          >
            🔔 Xabar
          </button>
          <button 
            className={`hdr-nav-btn ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            ⚙️ Sozlamalar
          </button>
        </div>
      </header>

      {/* TABS */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === "transactions" ? "active" : ""}`}
          onClick={() => setActiveTab("transactions")}
        >
          Stars
        </button>
        <button 
          className={`tab ${activeTab === "premium" ? "active" : ""}`}
          onClick={() => setActiveTab("premium")}
        >
          Premium
        </button>
        <button 
          className={`tab ${activeTab === "gift" ? "active" : ""}`}
          onClick={() => setActiveTab("gift")}
        >
          Gift
        </button>
        <button 
          className={`tab ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          Users
        </button>
      </div>

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
              <span className="info-label">⭐ Mavjud stars:</span>
              <span className="info-value gold">{walletLoading ? '...' : getAvailableStars().toLocaleString()}</span>
            </div>
            <div className="info-row">
              <span className="info-label">⭐ Userbot balansi:</span>
              <span className="info-value gold">{walletLoading ? '...' : botStarsBalance.toLocaleString()} ⭐</span>
            </div>
            <div className="info-row">
              <span className="info-label">💎 TON balance:</span>
              <span className="info-value">{walletLoading ? '...' : walletBalance.mainnet.toFixed(2)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">💵 50 stars narxi:</span>
              <span className="info-value green">{walletLoading ? '...' : (starPrices.priceFor50 || 0).toFixed(3)} TON</span>
            </div>
          </div>

          {/* ========== PERIOD PROFIT SUMMARY ========== */}
          {!analyticsLoading && (
            <div className="profit-summary-grid">
              <div className="profit-card today">
                <div className="profit-label">📅 Bugun</div>
                <div className="profit-main">
                  <span className="profit-value green">+{periodStats.today.profit.toLocaleString()}</span>
                  <span className="profit-unit">so'm foyda</span>
                </div>
                <div className="profit-sub">
                  <span>{periodStats.today.count} ta savdo</span>
                  <span>·</span>
                  <span>{periodStats.today.revenue.toLocaleString()} tushum</span>
                </div>
              </div>
              <div className="profit-card week">
                <div className="profit-label">📆 Hafta</div>
                <div className="profit-main">
                  <span className="profit-value green">+{periodStats.week.profit.toLocaleString()}</span>
                  <span className="profit-unit">so'm foyda</span>
                </div>
                <div className="profit-sub">
                  <span>{periodStats.week.count} ta savdo</span>
                  <span>·</span>
                  <span>{periodStats.week.revenue.toLocaleString()} tushum</span>
                </div>
              </div>
              <div className="profit-card month">
                <div className="profit-label">🗓️ Bu oy</div>
                <div className="profit-main">
                  <span className="profit-value green">+{periodStats.month.profit.toLocaleString()}</span>
                  <span className="profit-unit">so'm foyda</span>
                </div>
                <div className="profit-sub">
                  <span>{periodStats.month.count} ta savdo</span>
                  <span>·</span>
                  <span>{periodStats.month.revenue.toLocaleString()} tushum</span>
                </div>
              </div>
              <div className="profit-card all">
                <div className="profit-label">📊 Jami</div>
                <div className="profit-main">
                  <span className="profit-value gold">+{periodStats.all.profit.toLocaleString()}</span>
                  <span className="profit-unit">so'm foyda</span>
                </div>
                <div className="profit-sub">
                  <span>{periodStats.all.count} ta savdo</span>
                  <span>·</span>
                  <span>{periodStats.all.revenue.toLocaleString()} tushum</span>
                </div>
              </div>
            </div>
          )}

          {/* Sales Stats List with Profit */}
          {analyticsLoading ? (
            <div className="analytics-loading-v2">⏳ Yuklanmoqda...</div>
          ) : (
            <div className="info-list sales-list">
              <div className="info-row total-row">
                <span className="info-label">📈 Jami ({analyticsPeriod === 'day' ? 'Bugun' : analyticsPeriod === 'week' ? 'Hafta' : analyticsPeriod === 'month' ? 'Oy' : 'Barchasi'}):</span>
                <span className="info-value">
                  <b>{analyticsData.total.count}</b> ta &nbsp;·&nbsp; <b className="green">+{analyticsData.total.totalProfit.toLocaleString()}</b> foyda
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">⭐ Stars:</span>
                <span className="info-value">
                  {analyticsData.stars.count} ta &nbsp;·&nbsp; {analyticsData.stars.totalStars.toLocaleString()} ⭐ &nbsp;·&nbsp; <span className="green">+{analyticsData.stars.profit.toLocaleString()}</span>
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">💎 Premium:</span>
                <span className="info-value">
                  {analyticsData.premium.count} ta &nbsp;·&nbsp; <span className="green">+{analyticsData.premium.profit.toLocaleString()}</span>
                  {analyticsData.premium.byMonths && (
                    <span className="sub-info"> ({analyticsData.premium.byMonths[3]}×3oy, {analyticsData.premium.byMonths[6]}×6oy, {analyticsData.premium.byMonths[12]}×12oy)</span>
                  )}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">🎁 Gift:</span>
                <span className="info-value">
                  {analyticsData.gift.count} ta &nbsp;·&nbsp; {analyticsData.gift.totalStars.toLocaleString()} ⭐ &nbsp;·&nbsp; <span className="green">+{analyticsData.gift.profit.toLocaleString()}</span>
                </span>
              </div>
            </div>
          )}

          {/* Daily Stats with Profit */}
          <div className="info-list daily-list">
            <div className="list-title">📅 Oxirgi 7 kun (foyda bo'yicha)</div>
            {dailyStats.map((day, i) => (
              <div key={i} className={`info-row ${day.count > 0 ? 'has-data' : 'no-data'}`}>
                <span className="info-label">{new Date(day.date).toLocaleDateString('uz-UZ', {weekday: 'short', day: '2-digit', month: 'short'})}</span>
                <span className="info-value">
                  {day.count > 0 ? (
                    <>
                      <span className="green">+{day.profit.toLocaleString()}</span>
                      <span className="sub-info"> ({day.starsCount}⭐ {day.premiumCount}💎 {day.giftCount}🎁)</span>
                    </>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Profit Config Info */}
          <div className="info-list config-list">
            <div className="list-title">💰 Foyda formulasi</div>
            <div className="info-row">
              <span className="info-label">⭐ Stars:</span>
              <span className="info-value muted">har 1 star = {PROFIT_CONFIG.STARS_PROFIT_PER_UNIT} so'm</span>
            </div>
            <div className="info-row">
              <span className="info-label">💎 Premium 3oy:</span>
              <span className="info-value muted">{PROFIT_CONFIG.PREMIUM_COST[3].toLocaleString()} → {PROFIT_CONFIG.PREMIUM_SELL[3].toLocaleString()} = +{PROFIT_CONFIG.PREMIUM_PROFIT[3].toLocaleString()}</span>
            </div>
            <div className="info-row">
              <span className="info-label">💎 Premium 6oy:</span>
              <span className="info-value muted">{PROFIT_CONFIG.PREMIUM_COST[6].toLocaleString()} → {PROFIT_CONFIG.PREMIUM_SELL[6].toLocaleString()} = +{PROFIT_CONFIG.PREMIUM_PROFIT[6].toLocaleString()}</span>
            </div>
            <div className="info-row">
              <span className="info-label">💎 Premium 12oy:</span>
              <span className="info-value muted">{PROFIT_CONFIG.PREMIUM_COST[12].toLocaleString()} → {PROFIT_CONFIG.PREMIUM_SELL[12].toLocaleString()} = +{PROFIT_CONFIG.PREMIUM_PROFIT[12].toLocaleString()}</span>
            </div>
            <div className="info-row">
              <span className="info-label">🎁 Gift:</span>
              <span className="info-value muted">har 1 star = {PROFIT_CONFIG.GIFT_PROFIT_PER_STAR} so'm</span>
            </div>
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
            <span>Completed: <b>{stats.completed}</b></span>
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
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="filter-select">
              <option value="all">Hammasi</option>
              <option value="pending">⏳ Pending</option>
              <option value="completed">✅ Completed</option>
              <option value="expired">❌ Expired</option>
              <option value="failed">⚠️ Failed</option>
              <option value="error">🔴 Error</option>
            </select>
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
                  <div key={tx.id} className="order-card">
                    {/* Order Header - Horizontal */}
                    <div 
                      className="order-header"
                      onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                    >
                      <div className="order-main">
                        <span className="order-id">#{tx.id}</span>
                        <span className="order-user">@{tx.sender_username || '?'} → @{tx.username}</span>
                        <span className="order-stars">{tx.stars} ⭐</span>
                      </div>
                      <div 
                        className="order-status"
                        style={{ backgroundColor: getStatusColor(tx.status) }}
                      >
                        {getStatusIcon(tx.status)} {tx.status}
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

                        {/* Actions - for pending and error */}
                        {(tx.status === "pending" || tx.status === "error") && (
                          <div className="order-actions">
                            <button 
                              className="action-btn send"
                              onClick={(e) => { e.stopPropagation(); sendStars(tx.id); }}
                            >
                              🌟 Stars Send
                            </button>
                            <button 
                              className="action-btn expire"
                              onClick={(e) => { e.stopPropagation(); updateStatus(tx.id, "expired"); }}
                            >
                              ❌ Expire
                            </button>
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
            <select value={giftFilter} onChange={(e) => setGiftFilter(e.target.value)} className="filter-select">
              <option value="all">Hammasi</option>
              <option value="pending">⏳ Pending</option>
              <option value="completed">✅ Completed</option>
              <option value="expired">❌ Expired</option>
              <option value="error">🔴 Error</option>
            </select>
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
                  <div key={tx.id} className="order-card">
                    <div 
                      className="order-header"
                      onClick={() => setGiftExpandedId(giftExpandedId === tx.id ? null : tx.id)}
                    >
                      <div className="order-main">
                        <span className="order-id">#{tx.id}</span>
                        <span className="order-user">@{tx.sender_username || '?'} → @{tx.username}</span>
                        <span className="order-stars">{tx.stars} ⭐ 🎁</span>
                      </div>
                      <div 
                        className="order-status"
                        style={{ backgroundColor: getStatusColor(tx.status) }}
                      >
                        {getStatusIcon(tx.status)} {tx.status}
                      </div>
                    </div>

                    {giftExpandedId === tx.id && (
                      <div className="order-details">
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
                            <span className="detail-value" style={{fontSize: '11px'}}>{tx.gift_id}</span>
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

                        {/* Actions */}
                        {(tx.status === "pending" || tx.status === "completed" || tx.status === "error") && (
                          <div className="order-actions">
                            {(tx.status === "pending" || tx.status === "completed" || tx.status === "error") && (
                              <button 
                                className="action-btn send"
                                onClick={(e) => { e.stopPropagation(); sendGift(tx.id); }}
                              >
                                🎁 Gift Yuborish
                              </button>
                            )}
                            {(tx.status === "pending" || tx.status === "error") && (
                              <button 
                                className="action-btn expire"
                                onClick={(e) => { e.stopPropagation(); expireGiftOrder(tx.id); }}
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
          <div className="filters">
            <input
              type="text"
              placeholder="🔍 Username yoki referral code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Users List */}
          {loading && !autoRefresh ? (
            <div className="loader">⏳ Yuklanmoqda...</div>
          ) : (
            <div className="users-list">
              {filteredUsers.length === 0 ? (
                <div className="empty-state">👤 Foydalanuvchilar yo'q</div>
              ) : (
                filteredUsers.slice(0, showAll ? filteredUsers.length : 20).map((u) => (
                  <div 
                    key={u.id} 
                    className="user-card"
                    onClick={() => setUserModal(u)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="user-main">
                      <span className="user-id">#{u.id}</span>
                      <span className="user-name">@{u.username}</span>
                    </div>
                    <div className="user-stats">
                      <span className="user-stat">💰 {u.referral_balance} ⭐</span>
                      <span className="user-stat">👥 {u.total_referrals}</span>
                      {u.som_balance > 0 && <span className="user-stat">💵 {(u.som_balance || 0).toLocaleString()}</span>}
                    </div>
                  </div>
                ))
              )}

              {filteredUsers.length > 20 && !showAll && (
                <button className="show-all-btn" onClick={() => setShowAll(true)}>
                  👥 Barcha foydalanuvchilar ({filteredUsers.length} ta)
                </button>
              )}

              {showAll && filteredUsers.length > 20 && (
                <button className="show-all-btn" onClick={() => setShowAll(false)}>
                  🔼 Faqat 20 tani ko'rish
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== PREMIUM ORDERS TAB ==================== */}
      {activeTab === "premium" && (
        <div className="tab-content">
          {/* Premium Stats */}
          <div className="stats-text">
            <span>Jami: <b>{premiumStats.total}</b></span>
            <span>Pending: <b>{premiumStats.pending}</b></span>
            <span>Completed: <b>{premiumStats.completed}</b></span>
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
            <select value={premiumFilter} onChange={(e) => setPremiumFilter(e.target.value)} className="filter-select">
              <option value="all">Hammasi</option>
              <option value="pending">⏳ Pending</option>
              <option value="completed">💎 Completed</option>
              <option value="expired">❌ Expired</option>
              <option value="failed">⚠️ Failed</option>
              <option value="error">🔴 Error</option>
            </select>
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
                  <div key={tx.id} className="order-card">
                    <div 
                      className="order-header"
                      onClick={() => setPremiumExpandedId(premiumExpandedId === tx.id ? null : tx.id)}
                    >
                      <div className="order-main">
                        <span className="order-id">#{tx.id}</span>
                        <span className="order-user">@{tx.sender_username || '?'} → @{tx.username}</span>
                        <span className="order-stars">{tx.months || 1} oy 💎</span>
                      </div>
                      <div 
                        className="order-status"
                        style={{ backgroundColor: getStatusColor(tx.status) }}
                      >
                        {getStatusIcon(tx.status)} {tx.status}
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

                        {/* Actions - for pending and error */}
                        {(tx.status === "pending" || tx.status === "error") && (
                          <div className="order-actions">
                            {tx.status === "error" && (
                              <button 
                                className="action-btn send"
                                onClick={(e) => { e.stopPropagation(); sendPremium(tx.id); }}
                              >
                                💎 Premium Send
                              </button>
                            )}
                            <button 
                              className="action-btn expire"
                              onClick={(e) => { e.stopPropagation(); expirePremiumOrder(tx.id); }}
                            >
                              ❌ Expired qilish
                            </button>
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

      {/* ==================== SETTINGS TAB ==================== */}
      {activeTab === "settings" && (
        <div className="tab-content settings-tab">
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

      {/* ==================== USER DETAILS MODAL ==================== */}
      {userModal && (
        <div className="balance-modal-overlay" onClick={() => setUserModal(null)}>
          <div className="balance-modal user-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="balance-modal-header">
              <h3>👤 Foydalanuvchi ma'lumotlari</h3>
              <button className="modal-close" onClick={() => setUserModal(null)}>✕</button>
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
  );
}
