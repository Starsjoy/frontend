import StarsJoyLoader from "./StarsJoyLoader";
import "./LogoWordmark.css";

// Logotip ostida "StarsJoy" matni ikonka bilan parallel — ikonkadagi
// yorug'lik chizig'i pastga o'tib, matnni ham yoritib "chizadi".
export default function LogoWordmark({ size = 120 }) {
  return (
    <div className="sj-word-wrap" style={{ "--sj-icon-size": `${size}px` }}>
      <StarsJoyLoader size={size} />
      <div className="sj-word sj-word--shimmer">
        <span className="sj-word-ghost">StarsJoy</span>
        <span className="sj-word-bright" aria-hidden="true">StarsJoy</span>
      </div>
    </div>
  );
}
