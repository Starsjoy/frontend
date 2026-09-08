import { useId } from "react";
import { STAR_PATH, SPARKLE_PATH, LOGO_VIEWBOX, LOGO_GROUP_TRANSFORM } from "../../assets/logoPaths";
import "./DrawShimmerLoader.css";

// Draw & Shimmer animatsiyasining rangli variantlari uchun umumiy dvigatel.
// starStops / sparkleStops: [ [offset, color], ... ]
export default function DrawShimmerLoader({ size = 120, starStops, sparkleStops, glow }) {
  const uid = useId();
  const starGradId = `sjDrawStar-${uid}`;
  const sparkleGradId = `sjDrawSparkle-${uid}`;
  const maskId = `sjDrawMask-${uid}`;
  const shimmerGradId = `sjDrawShimmer-${uid}`;

  return (
    <div className="sj-draw" style={{ "--sj-size": `${size}px` }}>
      <svg
        className="sj-draw-svg"
        viewBox={LOGO_VIEWBOX}
        width={size}
        height={size}
        style={glow ? { filter: `drop-shadow(0 4px 16px ${glow})` } : undefined}
      >
        <defs>
          <linearGradient id={starGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            {starStops.map(([offset, color]) => (
              <stop key={offset} offset={offset} stopColor={color} />
            ))}
          </linearGradient>
          <linearGradient id={sparkleGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            {sparkleStops.map(([offset, color]) => (
              <stop key={offset} offset={offset} stopColor={color} />
            ))}
          </linearGradient>
          <mask id={maskId}>
            <g transform={LOGO_GROUP_TRANSFORM}>
              <path d={STAR_PATH} fill="#fff" />
            </g>
          </mask>
          <linearGradient id={shimmerGradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        <g transform={LOGO_GROUP_TRANSFORM}>
          <path
            className="sj-draw-star"
            d={STAR_PATH}
            fill={`url(#${starGradId})`}
            stroke="#ffffff"
            strokeWidth="420"
            pathLength="1"
          />
          <path className="sj-draw-sparkle" d={SPARKLE_PATH} fill={`url(#${sparkleGradId})`} />
        </g>

        <g mask={`url(#${maskId})`}>
          <rect className="sj-draw-shimmer" x="-2000" y="0" width="1400" height="2000" fill={`url(#${shimmerGradId})`} />
        </g>
      </svg>
    </div>
  );
}
