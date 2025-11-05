import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <main style={wrap}>
      <section style={card}>
        <h1 style={title}>WordMafia</h1>
        <p style={subtitle}>A multilingual imposter word game powered by AI.</p>

        <div style={rulesBlock}>
          <h2 style={h2}>How to Play</h2>
          <ul style={rulesList}>
            <li>Pick the number of players and start a round.</li>
            <li>Everyone gets the <strong>same secret word</strong>—except one <strong>Imposter</strong>.</li>
            <li>Taking turns, give short hints/clues (no saying the word or obvious rhymes).</li>
            <li>After each round of clues, discuss and <strong>vote</strong> who you think is the Imposter.</li>
            <li>If the Imposter survives to the end, they win. If caught, the group wins.</li>
          </ul>

          <h3 style={h3}>Tips</h3>
          <ul style={rulesList}>
            <li>Keep clues subtle—help teammates, but don’t hand the word to the Imposter.</li>
            <li>Play region or category modes for cultural twists.</li>
            <li>Rounds are quick: 1–2 clues each, then vote.</li>
          </ul>
        </div>

        <div style={ctaRow}>
          <button style={playBtn} onClick={() => navigate("/setup")}>
            ▶ Play
          </button>
        </div>
      </section>
    </main>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "100svh",
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(180deg,#f8fafc,#ffffff)",
  padding: 24,
};

const card: React.CSSProperties = {
  width: "min(840px, 94vw)",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
};

const title: React.CSSProperties = { margin: 0, fontSize: 32, fontWeight: 800 };
const subtitle: React.CSSProperties = { margin: "6px 0 18px", color: "#6b7280" };
const rulesBlock: React.CSSProperties = { display: "grid", gap: 10 };
const h2: React.CSSProperties = { margin: "8px 0 4px", fontSize: 20, fontWeight: 800 };
const h3: React.CSSProperties = { margin: "8px 0 0", fontSize: 16, fontWeight: 700, color: "#374151" };

const rulesList: React.CSSProperties = {
    margin: 0,
    alignItems: 'left',
    listStyleType: 'none',
    color: "#374151",
    lineHeight: 1.6,
  };

const list: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  color: "#374151",
  lineHeight: 1.6,
};

const bullets: React.CSSProperties = {
  margin: "4px 0 0",
  paddingLeft: 18,
  color: "#4b5563",
  lineHeight: 1.6,
};

const ctaRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  marginTop: 18,
};

const playBtn: React.CSSProperties = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "1px solid #111827",
  background: "#111827",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};