import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, LogIn } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import LobbyShell, { lobbyStyles as s } from "../components/layout/LobbyShell";
import { GAME_NAME, UI_STRINGS, ROUTES } from "../constants/strings";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      aria-hidden
      style={{
        transform: open ? "rotate(180deg)" : "none",
        transition: "transform 0.2s ease",
        flexShrink: 0,
      }}
    >
      <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState({ howToPlay: true, ai: false, tips: false });
  const toggle = (k: keyof typeof open) => setOpen((prev) => ({ ...prev, [k]: !prev[k] }));

  return (
    <LobbyShell
      badge="Free party game"
      title={GAME_NAME}
      subtitle={UI_STRINGS.HOME_SUBTITLE}
      wide
      titleCenter
    >
      <div className={s.section}>
        <button
          type="button"
          className={s.disclosure}
          onClick={() => toggle("howToPlay")}
          aria-expanded={open.howToPlay}
        >
          <Chevron open={open.howToPlay} />
          <span className={s.disclosureTitle}>{UI_STRINGS.HOME_HOW_TO_PLAY}</span>
        </button>
        {open.howToPlay && (
          <div className={s.disclosureBody}>
            <ul className={s.rulesList}>
              <li>{UI_STRINGS.HOME_PICK_PLAYERS}</li>
              <li>
                Everyone gets the <strong>same secret word</strong>—except one{" "}
                <strong>Mafia</strong>.
              </li>
              <li>{UI_STRINGS.HOME_GIVE_CLUES}</li>
              <li>
                After each round of clues, discuss and <strong>vote</strong> who you
                think is the Mafia.
              </li>
              <li>{UI_STRINGS.HOME_WIN_CONDITION}</li>
            </ul>
          </div>
        )}
      </div>

      <div className={s.section}>
        <button
          type="button"
          className={s.disclosure}
          onClick={() => toggle("ai")}
          aria-expanded={open.ai}
        >
          <Chevron open={open.ai} />
          <span className={s.disclosureTitle}>Words from everywhere (AI-powered)</span>
        </button>
        {open.ai && (
          <div className={s.disclosureBody}>
            <p className={s.bodyText}>
              {GAME_NAME} uses AI to mix <strong>languages</strong> and{" "}
              <strong>regions</strong> you care about—e.g., Punjabi, Hindi, Urdu,
              Toronto, Punjab, the UK—so you’ll see words like <strong>“siyaal”</strong>{" "}
              or UK slang like <strong>“roadmen.”</strong>
            </p>
          </div>
        )}
      </div>

      <div className={s.section}>
        <button
          type="button"
          className={s.disclosure}
          onClick={() => toggle("tips")}
          aria-expanded={open.tips}
        >
          <Chevron open={open.tips} />
          <span className={s.disclosureTitle}>{UI_STRINGS.HOME_TIPS}</span>
        </button>
        {open.tips && (
          <div className={s.disclosureBody}>
            <ul className={s.rulesList}>
              <li>{UI_STRINGS.HOME_TIP_1}</li>
              <li>{UI_STRINGS.HOME_TIP_2}</li>
              <li>{UI_STRINGS.HOME_TIP_3}</li>
            </ul>
          </div>
        )}
      </div>

      <div className={s.ctaRow}>
        <button
          type="button"
          className={s.ctaPrimary}
          data-cy="play-local"
          onClick={() => navigate(ROUTES.SETUP)}
        >
          <Users size={20} aria-hidden />
          {UI_STRINGS.HOME_PLAY_BUTTON} (Local)
        </button>
        {!user && (
          <button
            type="button"
            className={s.ctaSecondary}
            data-cy="home-sign-in"
            onClick={() => navigate(ROUTES.LOGIN)}
          >
            <LogIn size={18} aria-hidden />
            {UI_STRINGS.AUTH_SIGN_IN} to play online
          </button>
        )}
      </div>
    </LobbyShell>
  );
}
