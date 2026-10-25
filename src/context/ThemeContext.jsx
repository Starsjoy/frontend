import { createContext, useContext, useEffect } from "react";
import { applyTelegramChrome } from "../utils/telegramChrome";
import WebApp from '@twa-dev/sdk'

const ThemeContext = createContext();

// Color palette definitions
export const themes = {
  light: {
    // Primary Colors
    primary: "#1e4ed8",
    primaryLight: "#e3f2fd",
    primaryDark: "#1a3a9c",
    
    // Backgrounds
    bg: "#ffffff",
    bgSecondary: "#f7f8fa",
    bgTertiary: "#f0f1f5",
    
    // Text
    text: "#111111",
    textSecondary: "#555555",
    textTertiary: "#888888",
    textInverse: "#ffffff",
    
    // Borders
    border: "#e0e0e0",
    borderLight: "#eed4d4",
    borderDark: "#d0d0d0",
    
    // Status Colors
    success: "#10b981",
    successLight: "#d1fae5",
    warning: "#f59e0b",
    warningLight: "#fef3c7",
    danger: "#ef4444",
    dangerLight: "#fee2e2",
    info: "#3b82f6",
    infoLight: "#dbeafe",
    
    // Shadows
    shadow: "0 4px 14px rgba(0,0,0,0.05)",
    shadowMd: "0 4px 15px rgba(0,0,0,0.06)",
    shadowLg: "0 10px 25px rgba(0,0,0,0.1)",
    
    // Special
    hoverBg: "rgba(0, 0, 0, 0.05)",
    inputBg: "#e8e7e7",
  },
  
  dark: {
    // Primary Colors
    primary: "#3b82f6",
    primaryLight: "#1f2937",
    primaryDark: "#1e40af",
    
    // Backgrounds
    bg: "#0f172a",
    bgSecondary: "#1e293b",
    bgTertiary: "#334155",
    
    // Text
    text: "#f1f5f9",
    textSecondary: "#cbd5e1",
    textTertiary: "#94a3b8",
    textInverse: "#0f172a",
    
    // Borders
    border: "#475569",
    borderLight: "#334155",
    borderDark: "#1e293b",
    
    // Status Colors
    success: "#10b981",
    successLight: "#064e3b",
    warning: "#f59e0b",
    warningLight: "#78350f",
    danger: "#ef4444",
    dangerLight: "#7f1d1d",
    info: "#60a5fa",
    infoLight: "#1e3a8a",
    
    // Shadows
    shadow: "0 4px 14px rgba(0,0,0,0.3)",
    shadowMd: "0 4px 15px rgba(0,0,0,0.4)",
    shadowLg: "0 10px 25px rgba(0,0,0,0.5)",
    
    // Special
    hoverBg: "rgba(255, 255, 255, 0.1)",
    inputBg: "#1e293b",
  }
};

// Provider Component
export function ThemeProvider({ children }) {
  const isDark = true;

  // Har doim dark mode
  useEffect(() => {
    localStorage.setItem("theme", "dark");
    document.documentElement.classList.add("dark-mode");
    document.documentElement.classList.remove("light-mode");
    applyTelegramChrome();
  }, []);

  const toggleTheme = () => {}; // no-op

  const theme = themes.dark;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Theme Hook
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
