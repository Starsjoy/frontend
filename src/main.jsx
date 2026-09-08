import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './theme.css'
import './index.css'
import { initVersionCheck } from './utils/versionCheck.js'

// Telegram Mini App SDK
import WebApp from '@twa-dev/sdk'

// Telegram WebApp ishga tayyor bo'lganda
WebApp.ready()

// Mini app qayta faollashganda yangi versiya borligini tekshirib,
// bo'lsa avtomatik reload qiladi (eski foydalanuvchilar qo'lda
// yangilamasdan yangi build'ni ko'radi)
initVersionCheck()

// Boshlang'ich rangni o'rnatish (tema ThemeContext'da boshqariladi)
// Dark mode ni tekshirish
const savedTheme = localStorage.getItem("theme");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
const isDark = savedTheme ? savedTheme === "dark" : prefersDark;

if (isDark) {
  WebApp.setBackgroundColor("#000000");
  WebApp.setHeaderColor("#000000");
} else {
  WebApp.setBackgroundColor("#ffffff");
  WebApp.setHeaderColor("#ffffff");
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
