import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./PlayerCountSelect.module.css";

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
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>Start Game</h1>
        <label className={styles.label}>
          Select number of players
          <select
            value={players}
            onChange={(e) => setPlayers(parseInt(e.target.value, 10))}
            className={styles.select}
          >
            {options.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button onClick={onEnter} className={styles.button}>
          Enter
        </button>
      </div>
    </div>
  );
}
