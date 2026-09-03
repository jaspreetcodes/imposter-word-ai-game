import type { ReactNode } from "react";
import styles from "./LobbyShell.module.css";

type Props = {
  title: string;
  subtitle?: string;
  badge?: string;
  wide?: boolean;
  titleCenter?: boolean;
  children?: ReactNode;
};

export default function LobbyShell({
  title,
  subtitle,
  badge,
  wide,
  titleCenter,
  children,
}: Props) {
  return (
    <main className={styles.lobby}>
      <div className={styles.glow} aria-hidden />
      <section className={`${styles.card} ${wide ? styles.cardWide : ""}`}>
        {badge ? <span className={styles.badge}>{badge}</span> : null}
        <h1
          className={`${styles.title} ${titleCenter ? styles.titleCenter : ""}`}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className={`${styles.subtitle} ${titleCenter ? styles.subtitleCenter : ""}`}
          >
            {subtitle}
          </p>
        ) : null}
        {children}
      </section>
    </main>
  );
}

export { styles as lobbyStyles };
