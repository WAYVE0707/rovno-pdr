import { useEffect, useRef, useState } from "react";

const W = 800;
const H = 620;
const CX = 400;
const CY = 372;
const SX = 165;
const SY = 132;

/** Панель с вмятиной в виде деформированной сетки: dent 1 — есть, 0 — ровно. */
export function DentSVG({ dent }: { dent: number }) {
  const d = Math.max(0, Math.min(1, dent));
  const amp = 74 * d;

  const bump = (x: number, y: number) => {
    const dx = (x - CX) / SX;
    const dy = (y - CY) / SY;
    return amp * Math.exp(-(dx * dx + dy * dy) * 0.9);
  };

  const hLines: string[] = [];
  for (let y = 44; y <= H - 40; y += 32) {
    const pts: string[] = [];
    for (let x = 30; x <= W - 30; x += 20) {
      pts.push(`${x},${(y + bump(x, y)).toFixed(1)}`);
    }
    hLines.push(`M ${pts.join(" L ")}`);
  }

  const vLines: string[] = [];
  for (let x = 30; x <= W - 30; x += 32) {
    const pts: string[] = [];
    for (let y = 44; y <= H - 40; y += 20) {
      const shift = bump(x, y) * 0.34;
      pts.push(`${(x + shift).toFixed(1)},${y}`);
    }
    vLines.push(`M ${pts.join(" L ")}`);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="panel" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#2b333c" />
          <stop offset="45%" stopColor="#1b2229" />
          <stop offset="100%" stopColor="#0d1216" />
        </linearGradient>
        <radialGradient id="dentShade" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#000000" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dentLight" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="72%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="88%" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      <rect width={W} height={H} fill="#0a0e12" />

      <path
        d="M42 118 C42 84 68 62 106 60 L712 46 C750 44 772 66 772 102 L780 502 C782 542 754 566 716 566 L96 578 C58 580 36 554 34 516 Z"
        fill="url(#panel)"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1"
      />

      {/* отражение софтбокса */}
      <rect x="150" y="50" width="120" height="530" fill="url(#sheen)" opacity="0.5" transform="rotate(-3 210 300)" />

      {/* сетка: деформируется вмятиной */}
      <g fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1">
        {hLines.map((p, i) => (
          <path key={`h${i}`} d={p} />
        ))}
        {vLines.map((p, i) => (
          <path key={`v${i}`} d={p} opacity="0.7" />
        ))}
      </g>

      {/* подложка вмятины */}
      <g style={{ opacity: d }}>
        <ellipse cx={CX} cy={CY} rx={168} ry={136} fill="url(#dentShade)" filter="url(#glow)" />
        <ellipse cx={CX} cy={CY} rx={168} ry={136} fill="url(#dentLight)" opacity="0.95" />
        <path
          d={`M ${CX - 118} ${CY - 6} C ${CX - 96} ${CY - 88} ${CX + 96} ${CY - 88} ${CX + 118} ${CY - 6}`}
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="3"
          fill="none"
          filter="url(#glow)"
        />
        <path
          d={`M ${CX - 112} ${CY + 24} C ${CX - 76} ${CY + 100} ${CX + 76} ${CY + 100} ${CX + 112} ${CY + 24}`}
          stroke="rgba(0,0,0,0.7)"
          strokeWidth="16"
          fill="none"
          filter="url(#glow)"
        />
      </g>

      {/* центральная ось */}
      <line x1="24" y1={CY} x2="776" y2={CY} stroke="rgba(255,255,255,0.07)" strokeDasharray="2 8" />
    </svg>
  );
}

type WipeProps = { auto?: boolean; initial?: number };

/** Перетаскиваемое сравнение «до / после». */
export function DentWipe({ auto = false, initial = 63 }: WipeProps) {
  const [pos, setPos] = useState(initial);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!auto) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = performance.now();
    const from = 94;
    const to = 63;
    setPos(from);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1500);
      const e = 1 - Math.pow(1 - t, 3);
      setPos(from + (to - from) * e);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [auto]);

  const update = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos(Math.max(4, Math.min(96, ((clientX - rect.left) / rect.width) * 100)));
  };

  return (
    <div className="dent">
      <div className="dent__top">
        <span>Симуляция · панель двери</span>
        <span className="mono">{pos > 58 ? "вмятина" : pos > 24 ? "выправляем" : "ровно"}</span>
      </div>

      <div
        className="dent__stage"
        ref={ref}
        onPointerDown={(e) => {
          dragging.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          update(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && update(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
      >
        <div className="dent__layer">
          <DentSVG dent={0} />
        </div>
        <div className="dent__layer" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <DentSVG dent={1} />
        </div>
        <div className="dent__divider" style={{ left: `${pos}%` }}>
          <span className="dent__grip">‹ ›</span>
        </div>
        <span className="dent__label">до</span>
        <span className="dent__label dent__label--right">после</span>
      </div>

      <div className="dent__foot">
        <span className="dent__hint">потяните ползунок влево</span>
        <span className="dent__hint">заводское ЛКП · без покраски</span>
      </div>
    </div>
  );
}
