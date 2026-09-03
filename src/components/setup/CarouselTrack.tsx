import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import styles from "./ThemeCarousel.module.css";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Horizontal scroll row with fade edges when more content is off-screen. */
export default function CarouselTrack({ children, className }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollFades = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateScrollFades();
    const ro = new ResizeObserver(updateScrollFades);
    ro.observe(el);
    el.addEventListener("scroll", updateScrollFades, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateScrollFades);
    };
  }, [updateScrollFades, children]);

  const outerClass = [
    styles.trackOuter,
    canScrollLeft ? styles.trackOuterCanScrollLeft : "",
    canScrollRight ? styles.trackOuterCanScrollRight : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={outerClass}>
      <div ref={trackRef} className={styles.track} role="list">
        {children}
      </div>
    </div>
  );
}
