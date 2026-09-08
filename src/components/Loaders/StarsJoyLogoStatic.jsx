import { useId } from "react";
import { STAR_PATH, SPARKLE_PATH, LOGO_VIEWBOX, LOGO_GROUP_TRANSFORM } from "../../assets/logoPaths";

// StarsJoyLoader bilan bir xil rangdagi, lekin animatsiyasiz — to'liq chizilgan
// yakuniy holatdagi statik logotip (masalan header'da ishlatish uchun).
const STAR_STOPS = [
  ["0%", "#9043f5"],
  ["35%", "#e23eae"],
  ["70%", "#5d9df4"],
  ["100%", "#6961f5"],
];

const SPARKLE_STOPS = [
  ["0%", "#ffffff"],
  ["100%", "#f5f3fa"],
];

export default function StarsJoyLogoStatic({ size = 32, className = "" }) {
  const uid = useId();
  const starGradId = `sjLogoStar-${uid}`;
  const sparkleGradId = `sjLogoSparkle-${uid}`;

  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      width={size}
      height={size}
      className={className}
      style={{ filter: "drop-shadow(0 2px 6px rgba(122, 101, 237, 0.45))", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={starGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          {STAR_STOPS.map(([offset, color]) => (
            <stop key={offset} offset={offset} stopColor={color} />
          ))}
        </linearGradient>
        <linearGradient id={sparkleGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          {SPARKLE_STOPS.map(([offset, color]) => (
            <stop key={offset} offset={offset} stopColor={color} />
          ))}
        </linearGradient>
      </defs>
      <g transform={LOGO_GROUP_TRANSFORM}>
        <path d={STAR_PATH} fill={`url(#${starGradId})`} />
        <path d={SPARKLE_PATH} fill={`url(#${sparkleGradId})`} />
      </g>
    </svg>
  );
}
