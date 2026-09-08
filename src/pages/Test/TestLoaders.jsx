import LogoWordmark from "../../components/Loaders/LogoWordmark";
import StarsJoyLoader from "../../components/Loaders/StarsJoyLoader";
import "./TestLoaders.css";

export default function TestLoaders() {
  return (
    <div className="sj-test-page">
      <div className="sj-test-header">
        <h1>StarsJoy loader</h1>
        <p>Logo + matn — shimmer bilan parallel chiziladi.</p>
      </div>

      <div className="sj-test-grid">
        <div className="sj-test-card">
          <div className="sj-test-preview sj-test-preview--large">
            <LogoWordmark size={140} />
          </div>
          <div className="sj-test-meta">
            <h2>Splash / katta holat</h2>
            <p>Logo va "StarsJoy" matni — ilova ochilganda to'liq ekran uchun.</p>
          </div>
        </div>

        <div className="sj-test-card">
          <div className="sj-test-preview sj-test-preview--small">
            <StarsJoyLoader size={44} />
          </div>
          <div className="sj-test-meta">
            <h2>Kichik holat</h2>
            <p>44px — faqat ikonka, nav-loading-overlay o'rniga (matnsiz).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
