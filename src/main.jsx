import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './theme.css'
import './index.css'
import { initVersionCheck } from './utils/versionCheck.js'
import { listenForSafeAreaFromParent } from './utils/tgSafeAreaBridge.js'
import { applyTelegramChrome } from './utils/telegramChrome.js'

// Telegram Mini App SDK
import WebApp from '@twa-dev/sdk'

// Telegram WebApp ishga tayyor bo'lganda
WebApp.ready()

// Mini app qayta faollashganda yangi versiya borligini tekshirib,
// bo'lsa avtomatik reload qiladi (eski foydalanuvchilar qo'lda
// yangilamasdan yangi build'ni ko'radi)
initVersionCheck()

// Agar bu sahifa Dashboard ichidagi <iframe>da yuklangan bo'lsa (Profil,
// Chegirma va h.k.), Telegram'ning safe-area qiymatlarini o'zi ololmaydi —
// ota oynadan (Dashboard) postMessage orqali oladi.
listenForSafeAreaFromParent()

// Telegram oynasi ranglari — ilova doim qorong'i. Avval telefon yorug' rejimda
// bo'lsa fon OQ qilinardi va sahifa chegaradan tortilganda oq ko'rinardi.
applyTelegramChrome();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
