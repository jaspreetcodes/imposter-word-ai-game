import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function GamePage() {
  const query = useQuery();
  const navigate = useNavigate();
  const players = Math.max(
    2,
    Math.min(25, parseInt(query.get("players") || "3", 10))
  );

  const initial = useMemo(
    () =>
      Array.from({ length: players }, (_, i) => ({
        id: i + 1,
        revealed: false,
      })),
    [players]
  );
  const [cards, setCards] = useState(initial);

  const toggle = (id: number) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, revealed: !c.revealed } : c))
    );
  };

  return (
    <div style={wrap}>
      <header style={header}>
        <button onClick={() => navigate("/")} style={backBtn}>
          ← Change Players
        </button>
        <h2 style={{ margin: 0, fontSize: 18, color: "#374151" }}>
          Players: <strong>{players}</strong>
        </h2>
      </header>

      <div style={grid}>
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => toggle(c.id)}
            className={`flip-card ${c.revealed ? "revealed" : ""}`}
          >
            <div className="flip-card-inner">
              <div className="flip-card-front">Player {c.id}</div>
              <div className="flip-card-back">NAN</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "100svh",
  background: "linear-gradient(180deg, #f8fafc, #ffffff)",
  padding: "24px",
};

const header: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  margin: "0 auto 16px",
  maxWidth: 1024,
};

const backBtn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#fff",
  cursor: "pointer",
};

const grid: React.CSSProperties = {
  margin: "0 auto",
  maxWidth: 1024,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
  gap: 16,
};
