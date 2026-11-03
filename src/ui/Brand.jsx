import { useId } from "react";

// StarsJoy belgilari: Telegram yulduzi va ilova ikonkalari
// Filtrsiz toza vektor: SVG filter telefonda xira chiziladi
const STAR_TONES = {
  gold: { top: "#ffe45c", mid: "#ffcb2e", end: "#ffb300", line: ["#f09a00", "#f07f00"], shine: "#fff6c8" },
  premium: { top: "#7ab8ff", mid: "#7f7bff", end: "#e56fd0", line: ["#5d8dff", "#b84fd8"], shine: "#dfe9ff" },
  accent: { top: "var(--star-top)", mid: "var(--star-mid)", end: "var(--star-end)", line: ["var(--star-line-a)", "var(--star-line-b)"], shine: "var(--star-shine)" },
};

export function TgStar({ size = 20, accent = false, outline = false, premium = false }) {
  const tone = STAR_TONES[premium ? "premium" : accent ? "accent" : "gold"];
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 21 21" width={size} height={size} overflow="visible" shapeRendering="geometricPrecision" aria-hidden="true">
      <defs>
        <path id={`${id}a`} d="m6.02 4.99 2.21-4.42c.25-.51.86-.72 1.37-.46.2.1.36.27.46.47l2.08 4.26c.17.34.5.58.88.63l4.36.52c.59.08 1.02.62.95 1.22-.03.24-.14.47-.32.65l-3.45 3.42c-.14.13-.2.33-.18.53l.57 4.61c.09.66-.38 1.27-1.03 1.35-.25.03-.5-.02-.72-.14l-3.64-2c-.26-.14-.58-.15-.85-.01l-3.77 1.95c-.53.27-1.18.06-1.45-.48-.11-.2-.14-.43-.11-.65l.3-2.12c.15-1.04.79-1.93 1.71-2.41l4.19-2.15c.11-.06.15-.2.1-.31-.05-.09-.14-.14-.24-.12l-5.12.74c-.78.11-1.58-.11-2.19-.62l-1.71-1.4c-.49-.4-.56-1.12-.17-1.62.19-.22.45-.37.74-.41l4.38-.57c.28-.03.52-.21.65-.46z" />
        <linearGradient id={`${id}b`} x1="25%" x2="74.92%" y1=".825%" y2="107.86%">
          <stop offset="0" style={{ stopColor: tone.top }} />
          <stop offset=".55" style={{ stopColor: tone.mid }} />
          <stop offset="1" style={{ stopColor: tone.end }} />
        </linearGradient>
        <linearGradient id={`${id}c`} x1="50%" x2="50%" y1="0%" y2="99.8%">
          <stop offset="0" style={{ stopColor: tone.line[0] }} />
          <stop offset="1" style={{ stopColor: tone.line[1] }} />
        </linearGradient>
        <clipPath id={`${id}k`}><use href={`#${id}a`} /></clipPath>
      </defs>
      <g fill="none" fillRule="evenodd" transform="translate(1.33 1.61)">
        {outline && <use stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" href={`#${id}a`} />}
        <use style={{ fill: tone.shine }} href={`#${id}a`} />
        <g clipPath={`url(#${id}k)`}>
          <use fill={`url(#${id}b)`} href={`#${id}a`} transform="translate(.7 .7)" />
        </g>
        <use stroke={`url(#${id}c)`} strokeWidth=".8" href={`#${id}a`} />
      </g>
    </svg>
  );
}

const Svg = ({ size = 22, children, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
    {children}
  </svg>
);

export const HomeIcon = (p) => <Svg {...p}><path d="M3.5 11 12 4l8.500 7" /><path d="M6 9.500V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.500" /></Svg>;
export const OrdersIcon = (p) => <Svg {...p}><rect x="5" y="3.500" width="14" height="17" rx="3" /><path d="M9 8.500h6M9 12.500h6M9 16.500h3" /></Svg>;
export const GiftIcon = (p) => <Svg {...p}><rect x="3.500" y="8" width="17" height="4.500" rx="1" /><path d="M5 12.500V20h14v-7.500" /><path d="M12 8v12" /><path d="M12 8c-1.500-3.500-5.500-4-5.500-1.500S9 8 12 8Zm0 0c1.500-3.500 5.500-4 5.500-1.500S15 8 12 8Z" /></Svg>;
export const ProfileIcon = (p) => <Svg {...p}><circle cx="12" cy="8.500" r="4" /><path d="M4.500 20c1.200-3.600 4-5 7.500-5s6.300 1.400 7.500 5" /></Svg>;
export const BellIcon = (p) => <Svg {...p}><path d="M6 10a6 6 0 1 1 12 0c0 5 2 6 2 7H4c0-1 2-2 2-7z" /><path d="M10 20.500a2.200 2.200 0 0 0 4 0" /></Svg>;
export const GlobeIcon = (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 3.600 9A14 14 0 0 1 12 21a14 14 0 0 1-3.600-9A14 14 0 0 1 12 3z" /></Svg>;
export const ChevronRight = (p) => <Svg strokeWidth="2.400" {...p}><path d="M9.500 5.500 16 12l-6.500 6.500" /></Svg>;
export const ChevronDown = (p) => <Svg strokeWidth="2.400" {...p}><path d="M5.500 9.500 12 16l6.500-6.500" /></Svg>;
export const SupportIcon = (p) => <Svg {...p}><path d="M4.500 13a7.500 7.500 0 0 1 15 0" /><rect x="3" y="13" width="4" height="6" rx="1.500" /><rect x="17" y="13" width="4" height="6" rx="1.500" /><path d="M19 19a3.500 3.500 0 0 1-3.500 2H13" /></Svg>;
export const ChannelIcon = (p) => <Svg {...p}><path d="M20.500 4.500 3.500 11.300l6 2.200 2.200 6 3.200-4 4.600 3.300z" /><path d="m9.500 13.500 5.500-4" /></Svg>;
export const ShieldIcon = (p) => <Svg {...p}><path d="m12 3 7 3v5c0 4.500-3 8.300-7 10-4-1.700-7-5.500-7-10V6l7-3z" /><path d="m8.800 12.200 2.200 2.200 4.200-4.400" /></Svg>;
export const CopyIcon = (p) => <Svg size={18} {...p}><rect x="9" y="9" width="12" height="12" rx="2.500" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></Svg>;
export const CheckIcon = (p) => <Svg size={18} strokeWidth="2.600" {...p}><path d="m5 12.500 4.500 4.500L19 7.500" /></Svg>;
export const ClockIcon = (p) => <Svg size={18} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>;
export const UsersIcon = (p) => <Svg {...p}><circle cx="9" cy="8.500" r="3.500" /><path d="M2.500 20c.8-3.300 3.200-5 6.500-5s5.700 1.700 6.500 5M16 5.300a3.500 3.500 0 0 1 0 6.400M18.500 15.300c1.700.7 2.700 2.300 3 4.700" /></Svg>;
export const TagIcon = (p) => <Svg {...p}><path d="M3.500 12.500V5a1.500 1.500 0 0 1 1.500-1.500h7.500L20.500 11.500a1.500 1.500 0 0 1 0 2.100l-6.900 6.900a1.500 1.500 0 0 1-2.100 0z" /><circle cx="8" cy="8" r="1.300" /></Svg>;
export const SendIcon = (p) => <Svg size={16} strokeWidth="2.400" {...p}><path d="M4 12h14M13 6l6 6-6 6" /></Svg>;
export const ToolIcon = (p) => <Svg {...p}><path d="M14.500 6.500a4 4 0 0 1 5-1.500l-3 3 1.500 1.500 3-3a4 4 0 0 1-5.500 5L8 18l-2-2 7-7a4 4 0 0 1 1.500-2.500z" /></Svg>;
export const ChevronLeft = (p) => <Svg strokeWidth="2.400" {...p}><path d="M14.500 5.500 8 12l6.500 6.500" /></Svg>;
