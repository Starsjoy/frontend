import { createContext, useContext, useState, useEffect } from "react";
import uz from "../locales/uz.json";
import en from "../locales/en.json";
import ru from "../locales/ru.json";
import apiFetch from "../utils/apiFetch";

const LanguageContext = createContext();

const translations = {
  uz,
  en,
  ru,
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("language") || "uz";
  });

  // Foydalanuvchi hech bo'lmaganda bir marta til tanlaganmi?
  const [languageChosen, setLanguageChosen] = useState(() => {
    return Boolean(localStorage.getItem("languageChosen"));
  });

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  // Boshqa oyna (iframe) da til o'zgarganda shu context ham yangilansin
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "language" && e.newValue && e.newValue !== language) {
        setLanguage(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [language]);

  const markLanguageChosen = () => {
    localStorage.setItem("languageChosen", "1");
    setLanguageChosen(true);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, languageChosen, markLanguageChosen }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const { language, setLanguage, languageChosen, markLanguageChosen } = useContext(LanguageContext);

  const t = (key) => {
    const keys = key.split(".");
    let value = translations[language];

    for (const k of keys) {
      if (value && typeof value === "object") {
        value = value[k];
      } else {
        // Fallback: ingliz tilida qidirish
        let fallback = translations["en"];
        for (const fk of keys) {
          if (fallback && typeof fallback === "object") {
            fallback = fallback[fk];
          } else {
            return key;
          }
        }
        return fallback || key;
      }
    }

    return value || key;
  };

  const changeLanguage = async (newLanguage) => {
    setLanguage(newLanguage);

    try {
      const username = localStorage.getItem("username");
      if (username) {
        await apiFetch("/api/user/language", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, language: newLanguage }),
        });
      }
    } catch (err) {
      console.error("Language save error:", err);
    }
  };

  return { t, language, setLanguage: changeLanguage, languageChosen, markLanguageChosen };
}
