import { useEffect, useRef, useState } from "react";

type Props = {
  before?: string;
  after?: string;
  auto?: boolean;
  initial?: number;
};

const clamp = (v: number, a = 2, b = 98) => Math.min(b, Math.max(a, v));

/** Фото «до/после» с перетаскиваемым ползунком и автопроездом при загрузке. */
export function HeroVisual({ before = "/works/hero/before.jpg", after = "/works/hero/after.jpg", auto = true, initial = 50 }: Props) {
  const [pos, setPos] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const frame = useRef<HTMLDivElement>(null);
  const raf = useRef<number>(0);

  // автопроезд: показываем, что ползунок живой
  useEffect(() => {
    if (!auto) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    const dur = 2600;
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      // проезд вправо, затем мягкий возврат к 52% — видно и «до», и «после»
      const value = t < 0.6 ? 8 + (82 - 8) * ease(t / 0.6) : 82 - (82 - 52) * ease((t - 0.6) / 0.4);
      setPos(value);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [auto]);

  const moveTo = (clientX: number) => {
    const el = frame.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos(clamp(((clientX - r.left) / r.width) * 100));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    cancelAnimationFrame(raf.current);
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    moveTo(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const el = frame.current;
    if (el) {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5;
      const dy = (e.clientY - r.top) / r.height - 0.5;
      setTilt({ x: dy * -5, y: dx * 7 });
    }
    if (dragging) moveTo(e.clientX);
  };

  const stop = () => {
    setDragging(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div className="hv">
      <div className="hv__glow hv__glow--a" />
      <div className="hv__glow hv__glow--b" />

      <div
        ref={frame}
        className={"hv__frame" + (dragging ? " is-drag" : "")}
        style={{ transform: `perspective(1100px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stop}
        onPointerLeave={stop}
      >
        <img className="hv__img" src={after} alt="Панель после удаления вмятины" draggable={false} />
        <div className="hv__before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <img className="hv__img" src={before} alt="Панель с вмятиной" draggable={false} />
        </div>

        <span className="hv__tag hv__tag--before">до</span>
        <span className="hv__tag hv__tag--after">после</span>

        <div className="hv__line" style={{ left: `${pos}%` }}>
          <span className="hv__grip" aria-hidden>
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
              <path d="M6 1 1 6l5 5M12 1l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>

      </div>

      <div className="hv__chip hv__chip--time">
        <b>35 мин</b>
        <span>одна вмятина</span>
      </div>
      <div className="hv__chip hv__chip--price">
        <span>вилка по фото</span>
        <b>2 500 – 3 500 ₽</b>
      </div>
    </div>
  );
}
