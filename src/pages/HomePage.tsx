import { useNavigate } from "react-router-dom";
import styles from "./HomePage.module.css";
import { GAME_NAME, UI_STRINGS, ROUTES } from "../constants/strings";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <main className={styles.wrap}>
      <section className={styles.card}>
        <h1 className={styles.title}>{GAME_NAME}</h1>
        <p className={styles.subtitle}>{UI_STRINGS.HOME_SUBTITLE}</p>

        <div className={styles.rulesBlock}>
          <div>
            <h2 className={styles.h2}>{UI_STRINGS.HOME_HOW_TO_PLAY}</h2>
            <ul className={styles.rulesList}>
              <li>{UI_STRINGS.HOME_PICK_PLAYERS}</li>
              <li>Everyone gets the <strong>same secret word</strong>—except one <strong>Mafia</strong>.</li>
              <li>{UI_STRINGS.HOME_GIVE_CLUES}</li>
              <li>After each round of clues, discuss and <strong>vote</strong> who you think is the Mafia.</li>
              <li>{UI_STRINGS.HOME_WIN_CONDITION}</li>
            </ul>
          </div>

          
          <div>
  <h3 className={styles.h3}>Words from everywhere, every language, every culture</h3>
  <p>
    Most word games pull from the same tired dictionary. We wanted something better.
    Our AI generates words from across <b>languages</b>, <b>regions</b>, and <b>cultures</b>—stuff you'd actually hear people say. Tell it where you're from or what languages you speak, and it'll mix things up. You might get <b>"siyaal"</b> (Punjabi for cold), <b>"mee"</b> (Marathi for rain), or UK slang like <b>"roadmen"</b>.
    It's not just about diversity for diversity's sake. It makes the game <b>way more interesting</b> when words come from your actual life—whether that's <b>Toronto slang</b>, <b>Urdu phrases</b>, or <b>inside jokes from your friend group</b>.
  </p>
</div>

<div>
            <h3 className={styles.h3}>{UI_STRINGS.HOME_TIPS}</h3>
            <ul className={styles.rulesList}>
              <li>{UI_STRINGS.HOME_TIP_1}</li>
              <li>{UI_STRINGS.HOME_TIP_2}</li>
              <li>{UI_STRINGS.HOME_TIP_3}</li>
            </ul>
          </div>
        </div>

        <div className={styles.ctaRow}>
          <button className={styles.playBtn} onClick={() => navigate(ROUTES.SETUP)}>
            {UI_STRINGS.HOME_PLAY_BUTTON}
          </button>
        </div>
      </section>
    </main>
  );
}