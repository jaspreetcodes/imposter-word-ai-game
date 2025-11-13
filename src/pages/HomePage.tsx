import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./HomePage.module.css";
import { GAME_NAME, UI_STRINGS, ROUTES } from "../constants/strings";

// ...imports
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden
      className={open ? styles.chevOpen : styles.chev}
    >
      <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState({ howToPlay: true, ai: false, tips: false });
  const toggle = (k: keyof typeof open) => setOpen((s) => ({ ...s, [k]: !s[k] }));

  return (
    <main className={styles.wrap}>
      <section className={styles.card}>
        <h1 className={styles.title}>{GAME_NAME}</h1>
        <p className={styles.subtitle}>{UI_STRINGS.HOME_SUBTITLE}</p>

        <div className={styles.rulesBlock}>
          {/* How to play */}
          <div className={styles.section}>
            <button
              className={styles.disclosure}
              onClick={() => toggle("howToPlay")}
              aria-expanded={open.howToPlay}
            >
              <Chevron open={open.howToPlay} />
              <span className={styles.disclosureTitle}>{UI_STRINGS.HOME_HOW_TO_PLAY}</span>
            </button>
            {open.howToPlay && (
              <ul className={styles.rulesListLg}>
                <li>{UI_STRINGS.HOME_PICK_PLAYERS}</li>
                <li>Everyone gets the <strong>same secret word</strong>—except one <strong>Mafia</strong>.</li>
                <li>{UI_STRINGS.HOME_GIVE_CLUES}</li>
                <li>After each round of clues, discuss and <strong>vote</strong> who you think is the Mafia.</li>
                <li>{UI_STRINGS.HOME_WIN_CONDITION}</li>
              </ul>
            )}
          </div>

          {/* AI */}
          <div className={styles.section}>
            <button
              className={styles.disclosure}
              onClick={() => toggle("ai")}
              aria-expanded={open.ai}
            >
              <Chevron open={open.ai} />
              <span className={styles.disclosureTitle}>Words from everywhere (AI-powered)</span>
            </button>
            {open.ai && (
              <p className={styles.bodyLg}>
                {GAME_NAME} uses AI to mix <strong>languages</strong> and <strong>regions</strong> you care about—
                e.g., Punjabi, Hindi, Urdu, Toronto, Punjab, the UK—so you’ll see words like
                <strong> “siyaal”</strong> or UK slang like <strong>“roadmen.”</strong>
              </p>
            )}
          </div>

          {/* Tips */}
          <div className={styles.section}>
            <button
              className={styles.disclosure}
              onClick={() => toggle("tips")}
              aria-expanded={open.tips}
            >
              <Chevron open={open.tips} />
              <span className={styles.disclosureTitle}>{UI_STRINGS.HOME_TIPS}</span>
            </button>
            {open.tips && (
              <ul className={styles.rulesListLg}>
                <li>{UI_STRINGS.HOME_TIP_1}</li>
                <li>{UI_STRINGS.HOME_TIP_2}</li>
                <li>{UI_STRINGS.HOME_TIP_3}</li>
              </ul>
            )}
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