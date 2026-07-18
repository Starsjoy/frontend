import { createContext, useCallback, useContext, useState } from "react";
import { useTranslation } from "./LanguageContext";

const OnboardingContext = createContext(null);

/**
 * O'rgatuvchi tur holati.
 *
 * tourStep: -1 = xizmat tanlash, 0+ = qadamlar, >= qadamlar soni = yakun ekrani.
 */
export function OnboardingProvider({ children }) {
  const { markOnboardingComplete } = useTranslation();
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(-1);
  const [tourService, setTourService] = useState(null);

  const startTour = useCallback(() => {
    setTourService(null);
    setTourStep(-1);
    setTourActive(true);
  }, []);

  const endTour = useCallback(() => {
    setTourActive(false);
    setTourService(null);
    setTourStep(-1);
    markOnboardingComplete();
  }, [markOnboardingComplete]);

  return (
    <OnboardingContext.Provider
      value={{ tourActive, tourStep, tourService, setTourStep, setTourService, startTour, endTour }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding faqat OnboardingProvider ichida ishlaydi");
  return ctx;
}
