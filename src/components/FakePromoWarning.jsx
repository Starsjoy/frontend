import { useEffect, useState } from "react";
import apiFetch from "../utils/apiFetch";
import "./FakePromoWarning.css";

/**
 * Soxta "tekin Stars/Gift/Premium" havolasi orqali kelgan userlarga (backend: fake_ref_warning)
 * ilova ochilishi bilan 3 tilda halol ogohlantirish. "Tushundim" bosilgach qayta chiqmaydi.
 */
const SEEN_KEY = "sj_fake_promo_seen";

const BLOCKS = [
  {
    title: "Diqqat!",
    paras: ["StarsJoy hech kimga tekin Stars, tekin Gift (sovg'a) yoki tekin Premium bermaydi. Sizga bularni tekinga va'da qilib yuborilgan havola rasmiy emas — StarsJoy bunday aksiya o'tkazmayapti.", "Stars, Gift va Premium faqat xarid orqali olinadi.", "Savollar bo'lsa, supportga yozing: @StarsjoySupport"],
  },
  {
    title: "Внимание!",
    paras: ["StarsJoy не раздаёт бесплатные Stars, подарки (Gift) или Premium. Ссылка, по которой вам это обещали бесплатно, не официальная — StarsJoy не проводит такую акцию.", "Stars, подарки и Premium можно получить только через покупку.", "Если есть вопросы, напишите в поддержку: @StarsjoySupport"],
  },
  {
    title: "Attention!",
    paras: ["StarsJoy does not give away free Stars, Gifts or Premium. The link that promised you these for free is not official — StarsJoy is not running any such giveaway.", "Stars, Gifts and Premium can only be obtained by purchase.", "If you have questions, contact support: @StarsjoySupport"],
  },
];

export default function FakePromoWarning() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Lokal dev: ?fakewarn=1 — backend'siz ko'rish uchun (production build'da yo'q)
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get("fakewarn") === "1") {
      setOpen(true);
      return undefined;
    }
    try {
      if (localStorage.getItem(SEEN_KEY) === "1") return undefined;
    } catch {
      /* storage yo'q — baribir ko'rsatamiz */
    }
    let alive = true;
    apiFetch("/api/user/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (alive && p?.fake_ref_warning) setOpen(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!open) return null;

  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <div className="fpw-overlay" role="dialog" aria-modal="true" aria-labelledby="fpw-title">
      <div className="fpw-panel">
        <div className="fpw-badge" aria-hidden="true">!</div>
        <h3 id="fpw-title" className="fpw-sr">Diqqat / Внимание / Attention</h3>
        {BLOCKS.map((b) => (
          <div className="fpw-block" key={b.title}>
            <b>⚠️ {b.title}</b>
            {b.paras.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>
        ))}
        <button type="button" className="fpw-cta" onClick={close}>
          Tushundim · Понятно · Got it
        </button>
      </div>
    </div>
  );
}
