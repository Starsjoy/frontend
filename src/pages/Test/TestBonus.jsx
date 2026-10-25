import { useState } from "react";
import BonusView from "../Bonus/BonusView";
import "./TestBonus.css";

/**
 * /test/bonus — Bonuslar bo'limi jonli simulyatsiyasi (API'siz).
 * "Olish", sovg'a almashtirish, balans va tarix haqiqiy oqimdagidek ishlaydi.
 */

const minsAgo = (m) => new Date(Date.now() - m * 60000).toISOString();

const CATALOG = [
  { id: "gift15", kind: "gift", cost: 15, stars: 15 },
  { id: "gift25", kind: "gift", cost: 25, stars: 25 },
  { id: "stars50", kind: "stars", cost: 50, stars: 50 },
  { id: "stars100", kind: "stars", cost: 100, stars: 100 },
];

const INITIAL_LEDGER = [
  { id: 7, delta: 4, kind: "purchase", meta: { order_type: "stars_paymee", type_amount: 100 }, recipient_username: "ali_valiyev", seen: false, created_at: minsAgo(2) },
  { id: 6, delta: 6, kind: "referral", meta: { friend_username: "dilnoza_m", type_amount: 100 }, seen: false, created_at: minsAgo(35) },
  { id: 5, delta: 6, kind: "purchase", meta: { order_type: "premium_paymee", type_amount: 6 }, recipient_username: "ali_valiyev", seen: false, created_at: minsAgo(95) },
  { id: 4, delta: -15, kind: "redeem", meta: { item: "gift15" }, seen: true, created_at: minsAgo(60 * 24) },
  { id: 3, delta: 2, kind: "purchase", meta: { order_type: "gift", type_amount: 50 }, recipient_username: "sardor_07", seen: true, created_at: minsAgo(60 * 30) },
  { id: 2, delta: 20, kind: "purchase", meta: { order_type: "stars_paymee", type_amount: 500 }, recipient_username: "ali_valiyev", seen: true, created_at: minsAgo(60 * 48) },
  { id: 1, delta: 11, kind: "purchase", meta: { order_type: "stars_paymee", type_amount: 250 }, recipient_username: "ali_valiyev", seen: true, created_at: minsAgo(60 * 72) },
];

export default function TestBonus() {
  const [balance, setBalance] = useState(31);
  const [ledger, setLedger] = useState(INITIAL_LEDGER);
  const [active, setActive] = useState(null);

  const onRedeem = async (itemId, recipient = "") => {
    await new Promise((r) => setTimeout(r, 900));
    const item = CATALOG.find((c) => c.id === itemId);
    if (!item || balance < item.cost) return { ok: false, code: "insufficient" };
    const id = Math.max(...ledger.map((e) => e.id)) + 1;
    setBalance((b) => b - item.cost);
    setLedger((l) => [{ id, delta: -item.cost, kind: "redeem", meta: { item: item.id, recipient_username: recipient || "ali_valiyev" }, seen: true, created_at: new Date().toISOString() }, ...l]);
    // yetkazish simulyatsiyasi: bir necha soniya "yuborilmoqda"
    setActive({ id, order_type: item.kind, type_amount: item.stars, status: "pending" });
    setTimeout(() => setActive(null), 3000);
    return { ok: true };
  };

  const data = {
    enabled: true,
    balance,
    catalog: CATALOG.map((c) => ({ ...c, can_redeem: balance >= c.cost })),
    ledger,
    active_redemption: active,
    referral_link: "https://t.me/StarsjoyBot/starsjoy?startapp=ref7x9k",
    has_username: true,
  };

  return (
    <div className="tb-page">
      <div className="tb-phone">
        <BonusView data={data} username="ali_valiyev" onRedeem={onRedeem} onSeen={() => {}} />
      </div>
    </div>
  );
}
