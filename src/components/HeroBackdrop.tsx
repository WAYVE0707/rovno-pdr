import { useEffect, useState } from "react";

/**
 * Фон hero: затемнённое фото, мягкие градиенты и проезжающая машина.
 * Всё декоративное, поэтому aria-hidden и отключается при prefers-reduced-motion.
 */
export function HeroBackdrop() {
  const [y, setY] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setY(Math.min(120, window.scrollY * 0.18)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="hbg" aria-hidden>
      <div className="hbg__photo" style={{ transform: `translate3d(0, ${y}px, 0) scale(1.06)` }} />
      <div className="hbg__sheen" />
      <div className="hbg__shade" />
      <div className="hbg__grain" />

      <div className="hbg__road">
        <svg className="hbg__car" viewBox="0 0 320 96" fill="none">
          <defs>
            <linearGradient id="carBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2b3238" />
              <stop offset="55%" stopColor="#12161a" />
              <stop offset="100%" stopColor="#05070a" />
            </linearGradient>
            <radialGradient id="headlight" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff2d8" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#ffb46b" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* кузов */}
          <path
            d="M14 70c0-9 6-15 15-17l28-6c9-13 24-21 45-23h58c17 1 30 6 40 15l30 4c14 2 22 9 22 19v9c0 5-4 9-9 9H23c-5 0-9-4-9-9v-1Z"
            fill="url(#carBody)"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="1.2"
          />
          {/* стёкла */}
          <path d="M104 47c8-9 19-14 33-15h44c13 1 22 5 30 12l-107 3Z" fill="rgba(150,190,220,0.18)" />
          {/* колёса */}
          <circle cx="82" cy="82" r="15" fill="#08090b" stroke="rgba(255,255,255,0.14)" />
          <circle cx="82" cy="82" r="6" fill="#1b2026" />
          <circle cx="240" cy="82" r="15" fill="#08090b" stroke="rgba(255,255,255,0.14)" />
          <circle cx="240" cy="82" r="6" fill="#1b2026" />
          {/* фара */}
          <ellipse cx="292" cy="62" rx="20" ry="12" fill="url(#headlight)" />
        </svg>
        <div className="hbg__trail" />
        <div className="hbg__beam" />
      </div>
    </div>
  );
}
