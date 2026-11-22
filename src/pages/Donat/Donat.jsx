import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import apiFetch from "../../utils/apiFetch";
import PaymentTransfer from "../../components/PaymentTransfer/PaymentTransfer";
import PaymentConfirm from "../../components/PaymentTransfer/PaymentConfirm";
import PaymentStatus from "../../components/PaymentTransfer/PaymentStatus";
import "../../components/PaymentTransfer/PaymentTransfer.css";
import { useTranslation } from "../../context/LanguageContext";
import { ChevronDown, ChevronLeft, ChevronRight, SupportIcon } from "../../ui/Brand";
import { SUPPORT_URL, curImgUrl, gameImgUrl, makeHelpers, preloadDonatImages } from "./donatText";
import "../Stars/Stars.css";
import "../../ui/ui.css";
import "./Donat.css";

/**
 * Donat (o'yin valyutasi): donat.starsjoy.uz va /donat.
 * Login talab qilinmaydi: faqat ochiq /api/donat/* endpointlari.
 * Qadamlar: 1 o'yin → 2 paket → 3 akkaunt (giftcard'da yo'q) → 4 tasdiq → to'lov → holat.
 * Joriy buyurtma tokeni localStorage'da: sahifa yangilansa to'lov/holat ekrani qaytadi.
 */

const STORE = "sjDonatOrder";
const SITE = "donat.starsjoy.uz";
const PACKS_COLLAPSED = 6;
const LANGS = ["uz", "ru", "en"];

const isDonatHost = () => window.location.hostname.startsWith("donat.");
const formatAmount = (num) => Number(num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const cardGroups = (num) => String(num || "").replace(/[^\d*]/g, "").replace(/(.{4})(?=.)/g, "$1 ");

function readStore() {
  try {
    const q = new URLSearchParams(window.location.search).get("order");
    const saved = JSON.parse(localStorage.getItem(STORE) || "null");
    if (q) return { token: q, paid: saved?.token === q ? Boolean(saved.paid) : false };
    if (saved?.token) return { token: saved.token, paid: Boolean(saved.paid) };
  } catch {
    /* localStorage yopiq */
  }
  return null;
}
function writeStore(v) {
  try {
    if (v) localStorage.setItem(STORE, JSON.stringify(v));
    else localStorage.removeItem(STORE);
  } catch {
    /* localStorage yopiq */
  }
}
function setQuery(key, value) {
  try {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  } catch {
    /* eski brauzer */
  }
}

// Rasm yuklanmasa, nomning bosh harfi chiqadi
function Art({ src, title, className }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className={`${className} dn-art-fallback`}>{(title || "?").charAt(0)}</span>;
  return <img className={className} src={src} alt="" width="128" height="128" decoding="async" onError={() => setFailed(true)} />;
}

export default function Donat() {
  const { language, setLanguageLocal } = useTranslation();
  useEffect(() => { preloadDonatImages(); }, []);
  const lang = LANGS.includes(language) ? language : "uz";
  const H = useMemo(() => makeHelpers(lang), [lang]);
  const { t } = H;
  const onDonatHost = isDonatHost();

  // ── katalog
  const [catalog, setCatalog] = useState(null);
  const [catalogState, setCatalogState] = useState("loading"); // loading | ok | error
  const initialGame = useRef(new URLSearchParams(window.location.search).get("game") || "");

  // ── forma
  const [step, setStep] = useState(1);
  const [slug, setSlug] = useState("");
  const [itemId, setItemId] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [pid, setPid] = useState("");
  const [zone, setZone] = useState("");
  const [contact, setContact] = useState("");
  const [nick, setNick] = useState(null); // { kind: ok|bad|wait, text, name }
  const [checkedFor, setCheckedFor] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const checkSeq = useRef(0);

  // ── buyurtma
  const saved = useRef(readStore());
  const [token, setToken] = useState(saved.current?.token || "");
  const [paid, setPaid] = useState(Boolean(saved.current?.paid));
  const [order, setOrder] = useState(null);
  const [view, setView] = useState(saved.current?.token ? "open" : ""); // confirm | open | hidden
  const [cancelAsk, setCancelAsk] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState("");

  const games = catalog?.games || [];
  const game = games.find((g) => g.slug === slug);
  const item = game?.items.find((i) => String(i.id) === String(itemId));
  const needsId = Boolean(game?.needs_player_id);
  const needsZone = Boolean(game?.needs_server);
  const pidVal = pid.trim().replace(/\s+/g, "");
  const zoneVal = zone.trim().replace(/[\s()]/g, "");
  const idKey = `${slug}:${pidVal}:${needsZone ? zoneVal : ""}`;

  const loadCatalog = useCallback(() => {
    setCatalogState("loading");
    apiFetch("/api/donat/catalog", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d?.success) throw new Error("catalog");
        setCatalog({ enabled: Boolean(d.enabled), pay_window_min: d.pay_window_min || 8, games: d.games || [] });
        setCatalogState("ok");
      })
      .catch(() => setCatalogState("error"));
  }, []);
  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  // ?game=<slug>: o'yin mavjud bo'lsa: to'g'ridan-to'g'ri paket qadamiga
  useEffect(() => {
    const want = initialGame.current;
    if (!catalog || !want) return;
    initialGame.current = "";
    const g = catalog.games.find((x) => x.slug === want);
    if (g && g.available && step === 1) {
      setSlug(g.slug);
      setStep(2);
    }
  }, [catalog, step]);

  // Qadam almashganda sahifa tepasiga
  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  // ── akkaunt tekshiruvi
  const checkPlayer = useCallback(async (force = false) => {
    if (!needsId) return true;
    if (!pidVal) { setNick({ kind: "bad", text: t.needId }); return false; }
    if (needsZone && !/^\d{1,8}$/.test(zoneVal)) { setNick({ kind: "bad", text: t.needZone }); return false; }
    if (!force && checkedFor === idKey && nick?.kind === "ok") return true;
    const seq = ++checkSeq.current;
    setNick({ kind: "wait", text: t.checking });
    try {
      const res = await apiFetch("/api/donat/check-player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: slug, player_id: pidVal, server_id: needsZone ? zoneVal : undefined, item: item?.name }),
      });
      const d = await res.json().catch(() => ({}));
      if (seq !== checkSeq.current) return false; // shu orada ID o'zgargan
      if (!res.ok || d.success === false) {
        setNick({ kind: "bad", text: d.error || t.errNet });
        setCheckedFor("");
        return false;
      }
      setNick({ kind: "ok", text: d.player_name || t.notVerified, name: d.player_name || null, region: d.region || "" });
      setCheckedFor(idKey);
      return true;
    } catch {
      if (seq === checkSeq.current) setNick({ kind: "bad", text: t.errNet });
      return false;
    }
  }, [needsId, needsZone, pidVal, zoneVal, checkedFor, idKey, nick, slug, item, t]);

  // ID yozib bo'lingach avtomatik tekshirish
  useEffect(() => {
    if (step !== 3 || !needsId || pidVal.length < 6 || (needsZone && !zoneVal)) return undefined;
    if (checkedFor === idKey) return undefined;
    const timer = setTimeout(() => checkPlayer(false), 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey, step]);

  const onIdInput = (setter) => (e) => {
    setter(e.target.value);
    checkSeq.current += 1;
    setNick(null);
    setCheckedFor("");
    setErr("");
  };

  // ── buyurtma: yaratish, kuzatish, bekor qilish
  const resetOrder = useCallback(() => {
    writeStore(null);
    setQuery("order", "");
    setToken("");
    setOrder(null);
    setPaid(false);
    setView("");
    setCancelAsk(false);
    setBusy(false);
    setErr("");
    setStep((s) => (s > 1 ? 2 : 1));
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    let alive = true;
    let timer;
    const tick = async () => {
      let nextDelay = 4000;
      try {
        const r = await apiFetch(`/api/donat/order/${encodeURIComponent(token)}`, { cache: "no-store" });
        if (!alive) return;
        if (r.status === 404) { resetOrder(); return; }
        const d = await r.json();
        if (!alive) return;
        if (d?.success) {
          setOrder((prev) => ({ ...(prev || {}), ...d, card: d.card || prev?.card }));
          if (d.state === "delivered" || d.state === "expired") return; // yakuniy holat
          if (d.state === "problem") nextDelay = 10000;
        }
      } catch {
        /* tarmoq xatosi: keyingi urinish */
      }
      if (alive) timer = setTimeout(tick, nextDelay);
    };
    tick();
    return () => { alive = false; clearTimeout(timer); };
  }, [token, resetOrder]);

  // To'lov taymeri
  const awaiting = order?.state === "awaiting_payment";
  useEffect(() => {
    if (!awaiting) return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [awaiting]);

  const expiresAt = order?.expires_at ? new Date(order.expires_at).getTime() : NaN;
  const left = Number.isFinite(expiresAt) ? Math.max(0, Math.round((expiresAt - now) / 1000)) : 0;

  let stage = null;
  if (order) {
    if (awaiting) stage = Number.isFinite(expiresAt) && left <= 0 ? "expired" : paid ? "pending" : "transfer";
    else stage = { delivering: "received", delivered: "success", problem: "failed", expired: "expired" }[order.state] || null;
  }

  const createOrder = async () => {
    if (!game || !item || busy) return;
    if (!(await checkPlayer(false))) { setStep(3); return; }
    setBusy(true);
    setErr("");
    try {
      const res = await apiFetch("/api/donat/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game: game.slug,
          item: item.id,
          player_id: needsId ? pidVal : undefined,
          server_id: needsZone ? zoneVal : undefined,
          contact: contact.trim() || undefined,
          lang,
          site: SITE,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.success === false || !d.token) {
        setErr(d.error || t.errNet);
        setBusy(false);
        return;
      }
      setOrder({
        ...d,
        state: "awaiting_payment",
        game: game.title,
        item: item.name,
        player_id: needsId ? pidVal : null,
        server_id: needsZone ? zoneVal : null,
        player_name: nick?.name || null,
      });
      setPaid(false);
      writeStore({ token: d.token, paid: false });
      setQuery("order", d.token);
      setToken(d.token);
      setView("confirm");
      setBusy(false);
    } catch {
      setErr(t.errNet);
      setBusy(false);
    }
  };

  const markPaid = (v) => {
    setPaid(v);
    if (token) writeStore({ token, paid: v });
  };

  const cancelOrder = () => {
    if (token && order?.state === "awaiting_payment") {
      apiFetch(`/api/donat/order/${encodeURIComponent(token)}/cancel`, { method: "POST" }).catch(() => {});
    }
    resetOrder();
  };

  const copy = (key, value) => {
    navigator.clipboard?.writeText(String(value)).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(""), 1600);
  };

  // ── navigatsiya
  const chooseGame = (g) => {
    if (!g.available) return;
    if (g.slug !== slug) {
      setItemId("");
      setPid("");
      setZone("");
      setNick(null);
      setCheckedFor("");
      setShowAll(false);
      setShowHelp(false);
    }
    setErr("");
    setSlug(g.slug);
    setStep(2);
  };

  const goBack = () => {
    setErr("");
    if (step === 4) setStep(needsId ? 3 : 2);
    else if (step === 3) setStep(2);
    else if (step === 2) { setStep(1); setQuery("game", ""); }
    else window.location.assign("/");
  };

  const onNext = async () => {
    if (step === 2) {
      if (!item) return;
      setStep(needsId ? 3 : 4);
    } else if (step === 3) {
      if (await checkPlayer(false)) setStep(4);
    } else if (step === 4) {
      createOrder();
    }
  };

  const cycleLang = () => setLanguageLocal(LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length]);

  // ── ko'rinish
  const minPrice = (g) => (g.items?.length ? Math.min(...g.items.map((i) => i.price)) : 0);
  const items = game?.items || [];
  const visibleItems = showAll || items.length <= PACKS_COLLAPSED + 1
    ? items
    : items.slice(0, PACKS_COLLAPSED).concat(items.slice(PACKS_COLLAPSED).filter((i) => String(i.id) === String(itemId)));

  const helpText = t.help[slug] || game?.id_hint || t.help._;
  const orderUnit = order ? games.find((g) => g.title === order.game || g.slug === order.game)?.unit : undefined;
  const orderPack = order ? H.pretty(order.item || "", orderUnit) : "";
  const orderProduct = order ? [order.game, orderPack].filter(Boolean).join(" · ") : "";
  const accountText = (o) =>
    o?.player_id ? `ID ${o.player_id}${o.server_id ? ` (${o.server_id})` : ""}${o.player_name ? ` · ${o.player_name}` : ""}` : "";

  const ctaReady = step === 2 ? Boolean(item) : step === 3 ? Boolean(pidVal) && (!needsZone || Boolean(zoneVal)) && nick?.kind !== "wait" : Boolean(item) && !busy;
  const ctaLabel = step === 4 ? t.pay : t.next;

  const renderHero = () => {
    if (step === 1 || !game) {
      return (
        <header className="sjs-starhero dn-hero">
          <div className="dn-hero__stack" aria-hidden="true">
            {["free-fire", "pubg-mobile", "mobile-legends"].map((s) => (
              <Art key={s} src={gameImgUrl(s)} title={s} className="dn-hero__img" />
            ))}
          </div>
          <h1>{t.title}</h1>
          <p>{t.sub}</p>
        </header>
      );
    }
    return (
      <header className="sjs-starhero dn-hero dn-hero--game">
        <div className="dn-hero__one">
          <Art src={gameImgUrl(game.slug)} title={game.title} className="dn-hero__logo" />
        </div>
        <h1>{game.title}</h1>
      </header>
    );
  };

  const renderGames = () => (
    <section className="sjs-field">
      <span className="sjs-label">{t.chooseGame}</span>
      <div className="sjg-grid dn-games">
        {games.map((g) => (
          <button
            key={g.slug}
            type="button"
            className={`sjg-card dn-game ${g.available ? "" : "is-off"} ${g.slug === slug ? "is-active" : ""}`}
            onClick={() => chooseGame(g)}
            disabled={!g.available}
          >
            <Art src={gameImgUrl(g.slug)} title={g.title} className="dn-game__img" />
            <span className="dn-game__title">{g.title}</span>
            <span className="sjg-card__price">
              {g.available ? t.from.replace("{p}", formatAmount(minPrice(g))) : t.unavailable}
            </span>
          </button>
        ))}
      </div>
    </section>
  );

  const renderPacks = () => (
    <section className="sjs-field">
      <span className="sjs-label">{t.choosePack}</span>
      <div className="sjs-starlist">
        {visibleItems.map((it) => {
          const p = H.parse(it.name, game.unit);
          return (
            <button
              key={it.id}
              type="button"
              className={`sjs-starrow ${String(itemId) === String(it.id) ? "is-active" : ""}`}
              onClick={() => { setItemId(it.id); setErr(""); }}
            >
              <span className="dn-cur" aria-hidden="true">
                {curImgUrl(game.slug) ? <img src={curImgUrl(game.slug)} alt="" width="26" height="26" /> : null}
              </span>
              <span className="sjs-starrow__n dn-pack__n">
                {p ? <><b>{p.qty}</b> {p.unit}</> : H.tr(it.name)}
              </span>
              <span className="sjs-starrow__p">{formatAmount(it.price)} {lang === "en" ? "UZS" : lang === "ru" ? "сум" : "so'm"}</span>
            </button>
          );
        })}
        {items.length > PACKS_COLLAPSED + 1 && (
          <button
            type="button"
            className={`sjs-starlist__toggle ${showAll ? "is-open" : ""}`}
            aria-expanded={showAll}
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? t.showLess : t.showMore}
            <ChevronDown size={16} />
          </button>
        )}
      </div>
      {!needsId && game?.secret_kind && (
        <p className="sjs-note dn-gap">{game.secret_kind === "code" ? t.noIdCode : t.noIdLink}</p>
      )}
    </section>
  );

  const nickBlock = nick && (
    nick.kind === "wait" ? (
      <div className="sjs-spin" />
    ) : nick.kind === "bad" ? (
      <p className="sjs-promo-msg is-error">{nick.text}</p>
    ) : (
      <div className="sjs-recipient">
        <span className="sjs-recipient__ph">{nick.name ? nick.name.charAt(0) : "i"}</span>
        <span>
          <b>{nick.name || t.found}</b>
          {nick.name ? `ID ${pidVal}${needsZone ? ` (${zoneVal})` : ""}${nick.region ? ` · ${nick.region}` : ""}` : nick.text}
        </span>
      </div>
    )
  );

  const renderAccount = () => (
    <section className="sjs-field">
      <label htmlFor="dn-pid">{game?.id_label || t.idLabel}</label>
      {needsZone ? (
        <>
          <div className="dn-idgrid">
            <input
              id="dn-pid"
              className="sjs-input"
              value={pid}
              onChange={onIdInput(setPid)}
              onKeyDown={(e) => e.key === "Enter" && checkPlayer(true)}
              placeholder="Player ID"
              inputMode="numeric"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
            <input
              className="sjs-input"
              value={zone}
              onChange={onIdInput(setZone)}
              onKeyDown={(e) => e.key === "Enter" && checkPlayer(true)}
              placeholder={t.zoneLabel}
              aria-label={t.zoneLabel}
              inputMode="numeric"
            />
          </div>
          <button type="button" className="dn-checkbtn" onClick={() => checkPlayer(true)}>{t.check}</button>
        </>
      ) : (
        <div className="sjs-inputrow">
          <input
            id="dn-pid"
            value={pid}
            onChange={onIdInput(setPid)}
            onKeyDown={(e) => e.key === "Enter" && checkPlayer(true)}
            placeholder="Player ID"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
          />
          <button type="button" className="sjs-mini" onClick={() => checkPlayer(true)}>{t.check}</button>
        </div>
      )}
      {nickBlock}
      <button type="button" className={`dn-help ${showHelp ? "is-open" : ""}`} onClick={() => setShowHelp(!showHelp)}>
        {t.idWhere}
        <ChevronDown size={15} />
      </button>
      {showHelp && <p className="sjs-note">{helpText}</p>}
    </section>
  );

  const renderReview = () => (
    <>
      <section className="sjs-field">
        <span className="sjs-label">{t.review}</span>
        <div className="sjs-starlist dn-summary">
          <div className="dn-row"><span>{t.rowGame}</span><b>{game?.title}</b></div>
          <div className="dn-row"><span>{t.rowPack}</span><b>{H.pretty(item?.name || "", game?.unit)}</b></div>
          {needsId && (
            <div className="dn-row">
              <span>{t.rowAccount}</span>
              <b>
                ID {pidVal}{needsZone ? ` (${zoneVal})` : ""}
                {nick?.name && <small>{nick.name}</small>}
              </b>
            </div>
          )}
          <div className="dn-row">
            <span>{t.rowDelivery}</span>
            <b>{game?.secret_kind === "code" ? t.codeDel : game?.secret_kind === "link" ? t.linkDel : t.auto}</b>
          </div>
        </div>
      </section>
      <section className="sjs-field">
        <label htmlFor="dn-contact">{t.contact} <span className="sjg-opt">{t.optional}</span></label>
        <input
          id="dn-contact"
          className="sjs-input"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={t.contactPh}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck="false"
          maxLength={64}
        />
      </section>
      {needsId && <p className="sjs-note dn-warn">{t.agree}</p>}
    </>
  );

  const renderState = (title, text, action) => (
    <div className="dn-state">
      <b>{title}</b>
      <p>{text}</p>
      {action}
      <a className="dn-support" href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
        <SupportIcon size={18} /> {t.support}
      </a>
    </div>
  );

  let content;
  if (catalogState === "loading" && !catalog) content = <div className="sjs-spin dn-loading" aria-label={t.loading} />;
  else if (catalogState === "error" && !catalog) {
    content = renderState(t.loadError, "", <button type="button" className="sjs-cta dn-state__cta" onClick={loadCatalog}>{t.retry}</button>);
  } else if (!catalog.enabled) content = renderState(t.closedTitle, t.closedText, null);
  else if (step === 1 || !game) content = <>{renderGames()}<p className="sjs-note">{t.note}</p></>;
  else if (step === 2) content = renderPacks();
  else if (step === 3) content = renderAccount();
  else content = renderReview();

  const showBar = Boolean(catalog?.enabled && game && step >= 2);
  const showBack = step > 1 || !onDonatHost;

  // ── to'lov va holat oynalari
  const deliveredSecret = stage === "success" && order?.link ? (
    order.secret_kind === "code" ? (
      <div className="dn-secret">
        <span className="ps-summary-label">{t.codeT}</span>
        <button type="button" className="dn-secret__code" onClick={() => copy("code", order.link)}>
          <code>{order.link}</code>
          <span>{copied === "code" ? t.copied : t.copy}</span>
        </button>
        <a className="ps-ghost dn-secret__btn" href="https://www.roblox.com/redeem" target="_blank" rel="noopener noreferrer">{t.redeem}</a>
        <p className="ps-extra">{t.codeH}</p>
      </div>
    ) : /^https?:\/\//i.test(order.link) ? (
      <div className="dn-secret">
        <span className="ps-summary-label">{t.linkT}</span>
        <a className="pt-cta dn-secret__btn" href={order.link} target="_blank" rel="noopener noreferrer">{t.open}</a>
        <p className="ps-extra">{t.linkH}</p>
      </div>
    ) : null
  ) : null;

  const overlays = order && view !== "hidden" && stage && (
    <>
      {stage === "transfer" && view === "confirm" && (
        <PaymentConfirm
          amount={order.amount}
          product={orderProduct}
          recipient=""
          note={accountText(order) || undefined}
          onContinue={() => setView("open")}
        />
      )}
      {stage === "transfer" && view !== "confirm" && (
        <PaymentTransfer
          cardDisplay={cardGroups(order.card?.number)}
          cardNumber={String(order.card?.number || "").replace(/\D/g, "")}
          cardName={order.card?.name || ""}
          amount={order.amount}
          countdown={left}
          item="donat"
          onClose={() => setCancelAsk(true)}
          onPaid={() => markPaid(true)}
          onCancel={() => setCancelAsk(true)}
          cancelLabel={t.cancel}
        />
      )}
      {stage !== "transfer" && (
        <PaymentStatus
          stage={stage}
          item="donat"
          product={orderProduct}
          productName={t.product}
          badge={orderPack}
          recipient=""
          amount={order.amount}
          countdown={left}
          orderId={order.order_id}
          extraNote={stage === "failed" ? t.problemNote : accountText(order)}
          onClose={() => {
            if (stage === "pending") markPaid(false);
            else if (stage === "received" || stage === "failed") setView("hidden");
            else resetOrder();
          }}
          onDone={resetOrder}
          onRetry={resetOrder}
        >
          {deliveredSecret}
        </PaymentStatus>
      )}
      {cancelAsk && stage === "transfer" && createPortal(
        <div className="pc-overlay dn-cancel" role="dialog" aria-modal="true" onClick={() => setCancelAsk(false)}>
          <div className="pc-panel" onClick={(e) => e.stopPropagation()}>
            <h3 className="pc-title">{t.cancelTitle}</h3>
            <p className="pc-sub">{t.cancelText}</p>
            <button type="button" className="pc-cta" onClick={() => setCancelAsk(false)}>{t.cancelNo}</button>
            <button type="button" className="ps-ghost ps-ghost--spaced dn-cancel__yes" onClick={cancelOrder}>{t.cancelYes}</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );

  return (
    <div className="sjp-root sjs-root dn-root">
      <div className={`sjs-page ${showBar ? "has-bar" : ""}`}>
        {showBack && (
          <button type="button" className="sjs-back sjs-back--float" onClick={goBack} aria-label={t.back}>
            <ChevronLeft size={20} />
          </button>
        )}
        <button type="button" className="sjs-back dn-lang" onClick={cycleLang} aria-label="Language">
          {lang.toUpperCase()}
        </button>

        {renderHero()}

        {order && view === "hidden" && (
          <button type="button" className="sjp-admin dn-active" onClick={() => setView("open")}>
            <span className="sjp-admin__text">
              <b>{t.activeOrder.replace("{id}", order.order_id || "")}</b>
              {t.activeOpen}
            </span>
            <span className="sjp-admin__chev"><ChevronRight size={18} /></span>
          </button>
        )}

        {content}

        {showBar && (
          <>
            {err && <p className="sjs-promo-msg is-error dn-err">{err}</p>}
            <div className="sjs-bar">
              <div className="sjs-bar__total">
                <span>{t.total}</span>
                <b>{formatAmount(item?.price || 0)} {lang === "en" ? "UZS" : lang === "ru" ? "сум" : "so'm"}</b>
              </div>
              <button
                type="button"
                className={`sjs-cta ${ctaReady ? "" : "is-dim"}`}
                onClick={onNext}
                disabled={busy}
              >
                {busy ? <span className="dn-btnspin" /> : ctaLabel}
              </button>
            </div>
          </>
        )}
      </div>

      {overlays}
    </div>
  );
}
