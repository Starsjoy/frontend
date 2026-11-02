/**
 * Admin panel matnidagi emojilarni ikonkaga aylantiradi.
 * Rangi va ko'rinishi CSS'da: `.ai` + `data-tone`.
 */
import { createElement, Fragment } from "react";
import {
  AlertTriangle, BarChart3, Bell, Bot, Calendar, CalendarDays, Check, CheckCheck, CheckCircle2,
  CircleDot, CircleHelp, ClipboardList, Clock, Cookie, Coins, Crown, CreditCard, FileText, Folder, Gem,
  Gift, Globe, Handshake, Heart, Hourglass, Inbox, Lock, Megaphone, Minus, Pause, Pencil, Plus, RefreshCw,
  Save, Search, Send, Settings, ShieldBan, ShoppingCart, Sparkles, Star, Tag, Target, Terminal,
  Ticket, Timer, Trash2, TrendingUp, Undo2, User, Users, Wrench, X, XCircle, Zap, Banknote, History, PawPrint,
} from "lucide-react";

const ICONS = {
  "⭐": [Star, "gold"], "🌟": [CheckCheck, "green"], "✨": [Sparkles, "gold"],
  "💎": [Gem, "blue"], "👑": [Crown, "gold"], "🎁": [Gift, "pink"], "🧸": [PawPrint, "pink"], "❤": [Heart, "pink"],
  "👥": [Users, "blue"], "👤": [User, "blue"], "🤝": [Handshake, "teal"],
  "✅": [CheckCircle2, "green"], "✓": [Check, "green"], "❌": [XCircle, "red"], "✕": [X, "grey"], "🚫": [ShieldBan, "red"],
  "⏳": [Hourglass, "amber"], "⏰": [Clock, "amber"], "⏱": [Timer, "amber"], "⏸": [Pause, "amber"], "🆕": [Sparkles, "teal"], "🕰": [History, "grey"], "🔄": [RefreshCw, "blue"], "↩": [Undo2, "grey"],
  "⚠": [AlertTriangle, "amber"], "🔴": [CircleDot, "red"], "🟢": [CircleDot, "green"], "🟣": [CircleDot, "violet"],
  "❓": [CircleHelp, "grey"], "🔔": [Bell, "amber"], "📣": [Megaphone, "violet"], "📊": [BarChart3, "teal"], "📈": [TrendingUp, "green"],
  "📋": [ClipboardList, "grey"], "📄": [FileText, "grey"], "📝": [Pencil, "grey"], "📁": [Folder, "grey"], "📭": [Inbox, "grey"],
  "📅": [Calendar, "grey"], "🗓": [CalendarDays, "grey"], "⚙": [Settings, "grey"], "🔧": [Wrench, "grey"], "🛠": [Wrench, "grey"],
  "🔍": [Search, "grey"], "➕": [Plus, "teal"], "➖": [Minus, "red"], "⚡": [Zap, "gold"], "🎟": [Ticket, "violet"], "🏷": [Tag, "violet"],
  "🗑": [Trash2, "red"], "💰": [Coins, "gold"], "💵": [Banknote, "green"], "💳": [CreditCard, "blue"], "🛒": [ShoppingCart, "blue"],
  "🌐": [Globe, "blue"], "🎯": [Target, "red"], "💾": [Save, "teal"], "🔐": [Lock, "grey"], "🤖": [Bot, "blue"], "📤": [Send, "blue"],
  "🍪": [Cookie, "gold"], "🐍": [Terminal, "green"],
};

const PATTERN = new RegExp(`(${Object.keys(ICONS).join("|")})\\uFE0F?`, "gu");

export const stripEmoji = (text) => text.replace(PATTERN, "").trim();

/** Emoji bo'lmasa o'sha satrning o'zini qaytaradi: React'ga ortiqcha ish tushmaydi */
export function iconize(text) {
  if (text.search(PATTERN) === -1) return text;
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(PATTERN)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const [Icon, tone] = ICONS[match[1]];
    parts.push(
      createElement("span", { className: "ai", "data-tone": tone, "aria-hidden": true },
        createElement(Icon, { size: "1em", strokeWidth: 2 }))
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return createElement(Fragment, null, ...parts);
}
