import { createContext, useContext, useState, useEffect, useCallback } from "react";
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

  const [languageChosen, setLanguageChosen] = useState(() =>
    Boolean(localStorage.getItem("languageChosen"))
  );
  const [onboardingCompleted, setOnboardingCompleted] = useState(() =>
    localStorage.getItem("spm_tour_done") === "1"
  );
  const [prefsLoading, setPrefsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await apiFetch("/api/user/preferences");
        if (!res.ok) throw new Error("prefs failed");
        const data = await res.json();
        if (cancelled) return;

        if (data.language) {
          setLanguage(data.language);
          localStorage.setItem("language", data.language);
        }

        if (data.exists) {
          const selected = Boolean(data.language_selected);
          setLanguageChosen(selected);
          if (selected) {
            localStorage.setItem("languageChosen", "1");
          } else {
            localStorage.removeItem("languageChosen");
          }

          const completed = Boolean(data.onboarding_completed);
          setOnboardingCompleted(completed);
          if (completed) {
            localStorage.setItem("spm_tour_done", "1");
          } else {
            localStorage.removeItem("spm_tour_done");
          }
        }
      } catch {
        // API ishlamasa — localStorage dagi qiymatlar bilan davom etamiz
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "language" && e.newValue && e.newValue !== language) {
        setLanguage(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [language]);

  const markLanguageChosen = useCallback(async (langCode) => {
    const lang = langCode || language;
    setLanguageChosen(true);
    localStorage.setItem("languageChosen", "1");
    localStorage.setItem("language", lang);

    try {
      await apiFetch("/api/user/language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      });
    } catch (err) {
      console.error("Language save error:", err);
    }
  }, [language]);

  const markOnboardingComplete = useCallback(async () => {
    setOnboardingCompleted(true);
    localStorage.setItem("spm_tour_done", "1");
    try {
      await apiFetch("/api/user/onboarding-complete", { method: "POST" });
    } catch (err) {
      console.error("Onboarding save error:", err);
    }
  }, []);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        languageChosen,
        markLanguageChosen,
        onboardingCompleted,
        markOnboardingComplete,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const {
    language,
    setLanguage,
    languageChosen,
    markLanguageChosen,
    onboardingCompleted,
    markOnboardingComplete,
  } = useContext(LanguageContext);

  const t = (key) => {
    const keys = key.split(".");
    let value = translations[language];

    for (const k of keys) {
      if (value && typeof value === "object") {
        value = value[k];
      } else {
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
    localStorage.setItem("language", newLanguage);

    try {
      await apiFetch("/api/user/language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: newLanguage }),
      });
      setLanguageChosen(true);
      localStorage.setItem("languageChosen", "1");
    } catch (err) {
      console.error("Language save error:", err);
    }
  };

  return {
    t,
    language,
    setLanguage: changeLanguage,
    languageChosen,
    markLanguageChosen,
    onboardingCompleted,
    markOnboardingComplete,
  };
}
