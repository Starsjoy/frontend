import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { openTelegramLink } from "../../utils/telegramLink";
import { useTranslation } from "../../context/LanguageContext";
import { TGSSticker } from "../../components/TGSSticker";
import starsGif from "../../assets/stars.gif";
import gift15Sticker from "../../assets/5170233102089322756.tgs";
import gift25Sticker from "../../assets/5168103777563050263.tgs";
import "./Bonus.css";

/**
 * Bonuslar bo'limi (taqdimot qismi). Ma'lumot va amallar tashqaridan keladi:
 *   Bonus.jsx      — haqiqiy API (/api/rewards/*)
 *   TestBonus.jsx  — /test/bonus, jonli simulyatsiya
 *
 * Yangi bonuslar (seen=false) "Yangi bonuslar" ro'yxatida turadi. User "Olish" ni
 * bosganda yulduzchalar balansga uchadi va hisoblagich oshadi. Server balansi
 * allaqachon yangilangan — bu faqat ko'rinish: ekrandagi balans = server balansi −
 * hali olinmagan bonuslar.
 */

const ITEM_VISUAL = {
  gift15: { sticker: gift15Sticker },
  gift25: { sticker: gift25Sticker },
  stars50: { gif: starsGif },
  stars100: { gif: starsGif },
};

const MAX_PARTICLES = 12;
const FLY_MS = 720;
const STAGGER_MS = 65;
const TABS = ["home", "catalog", "history"];
const ROW_LEAVE_MS = 420;
const FADE_OUT_MS = 200;

const StarIcon = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
    <path d="M12 2.8l2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 16.84 6.5 19.72l1.05-6.12L3.1 9.27l6.15-.9z" />
  </svg>
);

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const formatDate = (iso) => {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} · ${p(d.getHours())}:${p(d.getMinutes())}`;
};

function entryIcon(e) {
  const type = String(e.meta?.order_type || "");
  if (e.kind === "referral") return "👥";
  if (e.kind === "redeem") return "🎁";
  if (e.kind === "refund") return "↩️";
  if (e.kind === "admin") return "🎁";
  if (type === "gift") return "🎁";
  if (type.includes("premium")) return "💎";
  return "⭐";
}

export default function BonusView({ data, username, onRedeem, onSeen, onRefresh, initialTab = "home" }) {
  const { t } = useTranslation();
  const tr = useCallback(
    (key, vars = {}) => Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, v), t(`rewards.${key}`)),
    [t]
  );

  const entryLabel = (e) => {
    const m = e.meta || {};
    const type = String(m.order_type || "");
    switch (e.kind) {
      case "purchase":
        if (type === "gift") return tr("src_gift");
        if (type.includes("premium")) return tr("src_premium", { n: m.type_amount });
        return tr("src_stars", { n: m.type_amount });
      case "referral":
        return m.friend_username ? tr("src_referralUser", { u: m.friend_username }) : tr("src_referral");
      case "redeem":
        return tr(`item_${m.item}`);
      case "refund":
        return tr("src_refund");
      case "admin":
        return m.reason ? `${tr("src_admin")}: ${m.reason}` : tr("src_admin");
      default:
        return tr("src_admin");
    }
  };

  // Faqat O'Z xaridlari uchun qabul qiluvchi ko'rsatiladi (referal yozuvida do'stning ma'lumoti chiqmasin)
  const entrySub = (e) => {
    const recipient = e.kind === "purchase" ? String(e.recipient_username || e.meta?.recipient_username || "") : "";
    const date = formatDate(e.created_at);
    if (e.kind === "redeem") return `${tr("spentLabel")} · ${date}`;
    return recipient ? `${tr("forUser", { u: recipient.replace(/^@/, "") })} · ${date}` : date;
  };

  const [tab, setTab] = useState(TABS.includes(initialTab) ? initialTab : "home");
  const [showHow, setShowHow] = useState(false);
  const [closingModal, setClosingModal] = useState(null); // "how" | "confirm"
  const closeModal = (which) => {
    setClosingModal(which);
    setTimeout(() => {
      if (which === "how") setShowHow(false);
      else setConfirmItem(null);
      setClosingModal(null);
    }, FADE_OUT_MS);
  };

  const balance = data?.balance ?? 0;
  const catalog = data?.catalog || [];
  const history = useMemo(() => data?.ledger || [], [data?.ledger]);
  const enabled = data?.enabled !== false;
  const active = data?.active_redemption;

  const unseen = useMemo(
    () => history.filter((e) => !e.seen && e.delta > 0).sort((a, b) => a.id - b.id),
    [history]
  );

  // ===== Balans: server balansi − hali "olinmagan" bonuslar =====
  const [claimedIds, setClaimedIds] = useState(() => new Set());
  const [claimingId, setClaimingId] = useState(null);
  const [hiddenIds, setHiddenIds] = useState(() => new Set());
  const [leavingIds, setLeavingIds] = useState(() => new Set());
  const lockedSum = unseen.reduce((s, e) => (claimedIds.has(e.id) ? s : s + e.delta), 0);
  const target = balance - lockedSum;

  const [display, setDisplay] = useState(target);
  const animatingRef = useRef(false);
  useEffect(() => {
    if (!animatingRef.current) setDisplay(target);
  }, [target]);

  const [bump, setBump] = useState(0);
  const [particles, setParticles] = useState([]);
  const balanceIconRef = useRef(null);

  const flyStars = useCallback(
    (entry, sourceEl) =>
      new Promise((resolve) => {
        const from = sourceEl?.getBoundingClientRect?.();
        const to = balanceIconRef.current?.getBoundingClientRect?.();
        if (!from || !to || prefersReducedMotion()) {
          setDisplay((v) => v + entry.delta);
          setBump((b) => b + 1);
          resolve();
          return;
        }
        const count = Math.min(MAX_PARTICLES, Math.max(1, entry.delta));
        const base = Math.floor(entry.delta / count);
        let rest = entry.delta - base * count;
        const x0 = from.left + from.width / 2 - 9;
        const y0 = from.top + from.height / 2 - 9;
        const tx = to.left + to.width / 2 - 9;
        const ty = to.top + to.height / 2 - 9;
        let landed = 0;
        const list = Array.from({ length: count }, (_, i) => {
          const share = base + (rest-- > 0 ? 1 : 0);
          const jitter = ((i % 5) - 2) * 7;
          return {
            key: `${entry.id}-${i}`,
            x0: x0 + jitter,
            y0,
            dx: tx - (x0 + jitter),
            dy: ty - y0,
            delay: i * STAGGER_MS,
            onLand: () => {
              setDisplay((v) => v + share);
              setBump((b) => b + 1);
              landed += 1;
              if (landed === count) {
                setParticles((cur) => cur.filter((p) => !p.key.startsWith(`${entry.id}-`)));
                resolve();
              }
            },
          };
        });
        setParticles((cur) => [...cur, ...list]);
      }),
    []
  );

  const rowRefs = useRef({});

  const claimEntry = useCallback(
    async (entry) => {
      animatingRef.current = true;
      setClaimingId(entry.id);
      await flyStars(entry, rowRefs.current[entry.id]?.querySelector(".bv-claim"));
      setClaimedIds((cur) => new Set(cur).add(entry.id));
      setClaimingId(null);
      animatingRef.current = false;
      onSeen?.(entry.id);
      // "✓ Olindi" ko'rinib turadi, so'ng qator silliq so'nadi va yig'iladi
      setTimeout(() => setLeavingIds((cur) => new Set(cur).add(entry.id)), 750);
      setTimeout(() => setHiddenIds((cur) => new Set(cur).add(entry.id)), 750 + ROW_LEAVE_MS);
    },
    [flyStars, onSeen]
  );

  const pending = unseen.filter((e) => !hiddenIds.has(e.id));
  const claimable = pending.filter((e) => !claimedIds.has(e.id));
  const claimingAllRef = useRef(false);

  const claimAll = async () => {
    if (claimingAllRef.current) return;
    claimingAllRef.current = true;
    for (const e of claimable) {
      await claimEntry(e);
      await wait(180);
    }
    claimingAllRef.current = false;
  };

  // ===== Keyingi sovg'a (kartadagi progress) =====
  const sortedCatalog = [...catalog].sort((a, b) => a.cost - b.cost);
  const nextItem = sortedCatalog.find((i) => i.cost > display);
  const prevCost = [...sortedCatalog].reverse().find((i) => i.cost <= display)?.cost ?? 0;
  const nextProgress = nextItem
    ? Math.min(100, Math.round(((display - prevCost) / (nextItem.cost - prevCost)) * 100))
    : 100;

  // ===== Almashtirish =====
  const [confirmItem, setConfirmItem] = useState(null);
  const [toast, setToast] = useState(null); // { tone: info|success|error, text }
  const toastTimer = useRef(null);
  const hideToast = () => {
    setToast((cur) => (cur ? { ...cur, leaving: true } : cur));
    toastTimer.current = setTimeout(() => setToast(null), FADE_OUT_MS);
  };
  const showToast = (tone, text, ms = 3500) => {
    clearTimeout(toastTimer.current);
    setToast({ tone, text });
    if (ms) toastTimer.current = setTimeout(hideToast, ms);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const [sending, setSending] = useState(false);
  const busy = sending || Boolean(active);
  const canRedeem = (item) => enabled && display >= item.cost;

  // Qabul qiluvchi: default — o'zi; "Boshqa akkaunt" tanlansa username kiritiladi
  const [recipientMode, setRecipientMode] = useState("self");
  const [recipientInput, setRecipientInput] = useState("");
  const otherRecipient = recipientInput.trim().replace(/^@/, "");
  const otherValid = /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(otherRecipient);
  const recipientReady = recipientMode === "self" ? Boolean(username) : otherValid;

  const openConfirm = (item) => {
    setRecipientMode(username ? "self" : "other");
    setRecipientInput("");
    setConfirmItem(item);
  };

  const startRedeem = async () => {
    const item = confirmItem;
    const recipient = recipientMode === "self" ? "" : otherRecipient;
    closeModal("confirm");
    setSending(true);
    showToast("info", tr("sending"), 0);
    const res = await onRedeem(item.id, recipient);
    setSending(false);
    if (res?.ok) {
      showToast("success", tr("sent"));
    } else {
      const code = res?.code;
      const known = code && t(`rewards.err_${code}`) !== `rewards.err_${code}`;
      showToast("error", tr(known ? `err_${code}` : "err_generic"), 4500);
    }
    onRefresh?.();
  };

  // ===== Referal havola =====
  const link = data?.referral_link;
  const [copied, setCopied] = useState(false);
  const copyLink = () => {
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  const shareLink = () => {
    // Avval matn, keyin havola: Telegram "url" ni matndan oldin qo'yadi, shuning uchun
    // butun xabar bitta "url" parametrida beriladi
    const url = `https://t.me/share/url?url=${encodeURIComponent(`${tr("shareText")}\n\n${link}`)}`;
    openTelegramLink(url);
  };

  const visual = (item, size = "md") => {
    const v = ITEM_VISUAL[item.id] || {};
    return (
      <div className={`bv-visual bv-visual--${size}`}>
        {v.sticker ? <TGSSticker stickerPath={v.sticker} className="bv-visual-media" autoplay loop /> : <img src={v.gif} alt="" className="bv-visual-media" />}
      </div>
    );
  };

  const statusText = active && !toast ? tr("inProgress") : toast?.text;
  const statusTone = active && !toast ? "info" : toast?.tone;

  return (
    <div className="bv-root">
      <div className="bv-topcover" aria-hidden="true" />
      {/* ===== Sarlavha ===== */}
      <header className="bv-head">
        <h1 className="bv-title">{tr("title")}</h1>
        <button type="button" className="bv-how-btn" onClick={() => setShowHow(true)}>
          <span aria-hidden="true">?</span> {tr("howBtn")}
        </button>
      </header>

      <nav className="bv-tabs" role="tablist">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`bv-tab ${tab === key ? "is-active" : ""}`}
            onClick={() => setTab(key)}
          >
            {tr(`tab${key[0].toUpperCase()}${key.slice(1)}`)}
            {key === "home" && claimable.length > 0 && <span className="bv-tab-dot">{claimable.length}</span>}
          </button>
        ))}
      </nav>

      {statusText && (
        <div className={`bv-toast bv-toast--${statusTone} ${toast?.leaving ? "is-leaving" : ""}`}>{statusText}</div>
      )}
      {!enabled && <div className="bv-toast bv-toast--info">{tr("disabled")}</div>}

      <div key={tab} className="bv-pane">
      {/* ===== Karta (hamma tabda — balans doim ko'rinsin) ===== */}
      <section className={`bv-card ${tab === "home" ? "" : "is-compact"}`}>
        <div className="bv-card-shine" aria-hidden="true" />
        <div className="bv-card-top">
          <span className="bv-card-label">{tr("balanceLabel")}</span>
          <span className="bv-card-brand">✦ {tr("cardBrand")}</span>
        </div>
        <div className="bv-card-balance">
          <span ref={balanceIconRef} key={`i${bump}`} className={`bv-card-star ${bump ? "is-bump" : ""}`}>
            <StarIcon size={tab === "home" ? 30 : 22} />
          </span>
          <span key={`n${bump}`} className={`bv-card-value ${bump ? "is-bump" : ""}`}>
            {display.toLocaleString("ru-RU")}
          </span>
        </div>
        {tab === "home" && (
          <>
            <div className="bv-card-next">
              <div className="bv-card-next-row">
                <span>{nextItem ? tr("nextReward", { item: tr(`item_${nextItem.id}`) }) : tr("allUnlocked")}</span>
                {nextItem && <b>{tr("need", { n: nextItem.cost - display })}</b>}
              </div>
              <div className="bv-bar bv-bar--card">
                <div className="bv-bar-fill" style={{ width: `${nextProgress}%` }} />
              </div>
            </div>
            <button type="button" className="bv-card-cta" onClick={() => setTab("catalog")}>
              {tr("chooseGift")} <span aria-hidden="true">→</span>
            </button>
          </>
        )}
      </section>

      {/* ===== ASOSIY ===== */}
      {tab === "home" && (
        <>
          {/* Olinadigan bonus bo'lmasa — bo'lim umuman ko'rinmaydi */}
          {pending.length > 0 && (
          <section className="bv-section">
            <div className="bv-section-head">
              <h2 className="bv-h">{tr("pendingTitle")}</h2>
              {claimable.length > 1 && (
                <button type="button" className="bv-link-btn" onClick={claimAll} disabled={claimingId !== null}>
                  {tr("claimAll")}
                </button>
              )}
            </div>
            <ul className="bv-list">
                {pending.map((e) => {
                  const claimed = claimedIds.has(e.id);
                  const claiming = claimingId === e.id;
                  return (
                    <li
                      key={e.id}
                      ref={(el) => (rowRefs.current[e.id] = el)}
                      className={`bv-row bv-row--pending ${claimed ? "is-claimed" : ""} ${leavingIds.has(e.id) ? "is-leaving" : ""}`}
                    >
                      <span className="bv-row-ic">{entryIcon(e)}</span>
                      <div className="bv-row-main">
                        <span className="bv-row-title">{entryLabel(e)}</span>
                        <span className="bv-row-sub">{entrySub(e)}</span>
                      </div>
                      <button
                        type="button"
                        className={`bv-claim ${claiming ? "is-loading" : ""} ${claimed ? "is-done" : ""}`}
                        disabled={claimed || claimingId !== null}
                        onClick={() => claimEntry(e)}
                      >
                        {claimed ? `✓ ${tr("claimedLabel")}` : claiming ? tr("claiming") : (
                          <>
                            +{e.delta} <StarIcon size={13} /> <span className="bv-claim-word">{tr("claim")}</span>
                          </>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
          </section>
          )}

          {link && (
            <section className="bv-invite">
              <div className="bv-invite-head">
                <span className="bv-invite-ic" aria-hidden="true">👥</span>
                <div>
                  <h2 className="bv-invite-title">{tr("inviteTitle")}</h2>
                  <p className="bv-invite-desc">{tr("inviteDesc")}</p>
                </div>
              </div>
              <div className="bv-invite-actions">
                <button type="button" className="bv-btn bv-btn--ghost" onClick={copyLink}>
                  {copied ? `✓ ${tr("copied")}` : tr("copy")}
                </button>
                <button type="button" className="bv-btn bv-btn--indigo" onClick={shareLink}>
                  {tr("share")}
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {/* ===== SOVG'ALAR ===== */}
      {tab === "catalog" && (
        <section className="bv-section">
          <p className="bv-hint">{tr("catalogHint")}</p>
          <ul className="bv-catalog">
            {sortedCatalog.map((item) => {
              const ready = canRedeem(item);
              const progress = Math.min(100, Math.round((display / item.cost) * 100));
              return (
                <li key={item.id} className={`bv-gift ${ready ? "is-ready" : ""}`}>
                  {visual(item)}
                  <div className="bv-gift-main">
                    <span className="bv-gift-kind">{tr(`kind_${item.kind}`)}</span>
                    <span className="bv-gift-name">{tr(`item_${item.id}`)}</span>
                    {ready ? (
                      <span className="bv-gift-status is-ready">{tr("readyLabel")}</span>
                    ) : (
                      <>
                        <div className="bv-bar">
                          <div className="bv-bar-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="bv-gift-status">{tr("need", { n: item.cost - display })}</span>
                      </>
                    )}
                  </div>
                  <div className="bv-gift-side">
                    <span className="bv-gift-cost">
                      <StarIcon size={13} /> {item.cost}
                    </span>
                    {/* Balans yetmasa — tugma umuman ko'rinmaydi */}
                    {ready && (
                      <button
                        type="button"
                        className="bv-btn bv-btn--gold bv-gift-btn"
                        disabled={busy}
                        onClick={() => openConfirm(item)}
                      >
                        {tr("get")}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ===== TARIX ===== */}
      {tab === "history" && (
        <section className="bv-section">
          {history.length === 0 ? (
            <div className="bv-empty">
              <span className="bv-empty-ic" aria-hidden="true">📭</span>
              {tr("historyEmpty")}
            </div>
          ) : (
            <ul className="bv-list">
              {history.map((e, i) => (
                <li key={e.id} className="bv-row" style={{ "--i": Math.min(i, 10) }}>
                  <span className="bv-row-ic">{entryIcon(e)}</span>
                  <div className="bv-row-main">
                    <span className="bv-row-title">{entryLabel(e)}</span>
                    <span className="bv-row-sub">{entrySub(e)}</span>
                  </div>
                  <span className={`bv-delta ${e.delta > 0 ? "is-plus" : "is-minus"}`}>
                    {e.delta > 0 ? `+${e.delta}` : `−${Math.abs(e.delta)}`} ⭐
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      </div>

      {/* Uchayotgan yulduzchalar — body'ga, hech qanday konteyner kesmasin */}
      {typeof document !== "undefined" &&
        createPortal(
          <div className="bv-fly-layer" aria-hidden="true">
            {particles.map((p) => (
              <span
                key={p.key}
                className="bv-fly"
                style={{ left: p.x0, top: p.y0, "--dx": `${p.dx}px`, "--dy": `${p.dy}px`, "--delay": `${p.delay}ms`, "--dur": `${FLY_MS}ms` }}
                onAnimationEnd={(ev) => ev.target === ev.currentTarget && p.onLand()}
              >
                <span className="bv-fly-y">
                  <StarIcon size={18} />
                </span>
              </span>
            ))}
          </div>,
          document.body
        )}

      {/* ===== Qanday ishlaydi (faqat ✕ bilan yopiladi) ===== */}
      {showHow && (
        <div className={`bv-overlay ${closingModal === "how" ? "is-closing" : ""}`}>
          <div className="bv-modal" role="dialog" aria-modal="true" aria-labelledby="bv-how-title">
            <button type="button" className="bv-modal-x" onClick={() => closeModal("how")} aria-label={tr("close")}>✕</button>
            <span className="bv-modal-badge" aria-hidden="true">⭐</span>
            <h3 id="bv-how-title" className="bv-modal-title">{tr("howTitle")}</h3>
            <p className="bv-modal-text">{tr("howDesc")}</p>
            <ul className="bv-rules">
              <li><span>⭐</span><b>{tr("ruleStars")}</b><em>+2</em></li>
              <li><span>💎</span><b>{tr("rulePremium")}</b><em>+3 · +6 · +12</em></li>
              <li><span>🎁</span><b>{tr("ruleGift")}<small>{tr("ruleGiftNote")}</small></b><em>+1 · +2 · +3</em></li>
              <li><span>👥</span><b>{tr("ruleReferral")}<small>{tr("ruleReferralNote")}</small></b><em>+3</em></li>
              <li><span>👥</span><b>{tr("ruleReferralPremium")}<small>{tr("ruleReferralNote")}</small></b><em>+3 · +6 · +12</em></li>
            </ul>
          </div>
        </div>
      )}

      {/* ===== Tasdiqlash (✕ yoki "Bekor qilish" bilan yopiladi) ===== */}
      {confirmItem && (
        <div className={`bv-overlay ${closingModal === "confirm" ? "is-closing" : ""}`}>
          <div className="bv-modal" role="dialog" aria-modal="true" aria-labelledby="bv-confirm-title">
            <button type="button" className="bv-modal-x" onClick={() => closeModal("confirm")} aria-label={tr("close")}>✕</button>
            {visual(confirmItem, "lg")}
            <h3 id="bv-confirm-title" className="bv-modal-title">{tr("confirmTitle")}</h3>
            <p className="bv-modal-text">
              {tr("confirmText", { cost: confirmItem.cost, item: tr(`item_${confirmItem.id}`) })}
            </p>

            <div className="bv-recipient">
              <span className="bv-recipient-label">{tr("recipientLabel")}</span>
              <div className="bv-seg" role="radiogroup">
                <button
                  type="button"
                  role="radio"
                  aria-checked={recipientMode === "self"}
                  className={`bv-seg-btn ${recipientMode === "self" ? "is-active" : ""}`}
                  disabled={!username}
                  onClick={() => setRecipientMode("self")}
                >
                  {tr("recipientSelf")}
                  {username && <small>@{username}</small>}
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={recipientMode === "other"}
                  className={`bv-seg-btn ${recipientMode === "other" ? "is-active" : ""}`}
                  onClick={() => setRecipientMode("other")}
                >
                  {tr("recipientOther")}
                </button>
              </div>
              {recipientMode === "other" && (
                <>
                  <label className={`bv-input ${recipientInput && !otherValid ? "is-invalid" : ""}`}>
                    <span>@</span>
                    <input
                      type="text"
                      inputMode="text"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      maxLength={33}
                      placeholder={tr("recipientPlaceholder")}
                      value={recipientInput}
                      onChange={(e) => setRecipientInput(e.target.value.replace(/\s/g, ""))}
                    />
                  </label>
                  {recipientInput && !otherValid && <p className="bv-modal-warn">{tr("err_bad_recipient")}</p>}
                </>
              )}
            </div>

            <button type="button" className="bv-btn bv-btn--gold bv-modal-btn" disabled={!recipientReady} onClick={startRedeem}>
              {tr("confirmCta")}
            </button>
            <button type="button" className="bv-btn bv-btn--plain bv-modal-btn" onClick={() => closeModal("confirm")}>
              {tr("cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
