import { useState } from "react";
import { useTranslation } from "../context/LanguageContext";
import "./LanguageSetup.css";

const LANGUAGES = [
  { code: "uz", flag: "🇺🇿", name: "O'zbekcha", native: "O'zbek" },
  { code: "en", flag: "🇬🇧", name: "English", native: "English" },
  { code: "ru", flag: "🇷🇺", name: "Русский", native: "Русский" },
];

export default function LanguageSetup() {
  const { setLanguage, markLanguageChosen } = useTranslation();
  const [selected, setSelected] = useState("uz");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    await setLanguage(selected);
    await markLanguageChosen(selected);
    setLoading(false);
  };

  return (
    <div className="lang-setup-screen">
      <div className="lang-setup-card">
        {/* Logo */}
        <div className="lang-setup-logo">
          <div className="lang-setup-star">⭐</div>
          <div className="lang-setup-brand">Stars<em>Joy</em></div>
        </div>

        {/* Multilang title */}
        <div className="lang-setup-title">
          <span>Xush kelibsiz!</span>
          <span className="lang-setup-separator">·</span>
          <span>Welcome!</span>
          <span className="lang-setup-separator">·</span>
          <span>Добро пожаловать!</span>
        </div>

        <p className="lang-setup-subtitle">
          Tilni tanlang / Select language / Выберите язык
        </p>

        {/* Language options */}
        <div className="lang-setup-options">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              className={`lang-setup-btn${selected === lang.code ? " active" : ""}`}
              onClick={() => setSelected(lang.code)}
            >
              <span className="lang-setup-flag">{lang.flag}</span>
              <span className="lang-setup-name">{lang.native}</span>
              {selected === lang.code && (
                <span className="lang-setup-check">✓</span>
              )}
            </button>
          ))}
        </div>

        {/* Continue button */}
        <button
          className="lang-setup-continue"
          onClick={handleContinue}
          disabled={loading}
        >
          {loading ? "..." : selected === "uz" ? "Davom etish" : selected === "en" ? "Continue" : "Продолжить"}
        </button>
      </div>
    </div>
  );
}
