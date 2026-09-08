import { STAR_PATH, LOGO_VIEWBOX, LOGO_GROUP_TRANSFORM } from "../../assets/logoPaths";
import "./StarOutlineLoader.css";

// Bo'limlar orasidagi o'tish uchun minimal loader — faqat yulduzning oq
// konturi chizilib-o'chirilib turadi, rangga to'lish va matn yo'q.
export default function StarOutlineLoader({ size = 64 }) {
  return (
    <svg className="sj-star-outline" viewBox={LOGO_VIEWBOX} width={size} height={size}>
      <g transform={LOGO_GROUP_TRANSFORM}>
        <path
          className="sj-star-outline__path"
          d={STAR_PATH}
          fill="none"
          stroke="#ffffff"
          strokeWidth="420"
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength="1"
        />
      </g>
    </svg>
  );
}
