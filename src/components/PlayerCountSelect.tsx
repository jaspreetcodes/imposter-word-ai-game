import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function PlayerCountSelect() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<number>(3);

  const options = useMemo(() => {
    const nums: number[] = [];
    for (let i = 2; i <= 25; i++) nums.push(i);
    return nums;
  }, []);

  const onEnter = () => {
    // navigate with query param ?players=#
    navigate(`/game?players=${players}`);
  };

  return (
    <div style={wrap}>
      <div style={card}>
        <h1 style={title}>Start Game</h1>
        <label style={label}>
          Select number of players
          <select
            value={players}
            onChange={(e) => setPlayers(parseInt(e.target.value, 10))}
            style={select}
          >
            {options.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button onClick={onEnter} style={button}>
          Enter
        </button>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "100svh",
  display: "grid",
  placeItems: "center",
  background: "linear-gradient(180deg, #fafafa, #ffffff)",
  padding: "24px",
};

const card: React.CSSProperties = {
  width: "min(520px, 92vw)",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
};

const title: React.CSSProperties = {
  margin: "0 0 16px",
  fontSize: 24,
  fontWeight: 700,
};

const label: React.CSSProperties = {
  display: "grid",
  gap: 8,
  marginBottom: 16,
  fontSize: 14,
};

const select: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 16,
  background: "#fff",
};

const button: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #111827",
  background: "#111827",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};
