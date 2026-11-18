import { motion } from "framer-motion";

type ZoneId = "hood" | "roof" | "door" | "fender" | "trunk" | "sill" | "pillar";

const CAPTIONS: Record<ZoneId, string> = {
  hood: "Капот — самая частая зона после града",
  roof: "Крыша — работаем с подъёмника, цена выше",
  door: "Дверь — доступ с двух сторон, ремонт быстрый",
  fender: "Крыло — часто с демонтажом подкрылка",
  trunk: "Багажник — тонкий металл, нужна аккуратность",
  sill: "Порог — жёсткое ребро, работа дольше",
  pillar: "Стойка — без демонтажа стекла не обойтись",
};

const NAMES: Record<ZoneId, string> = {
  hood: "капот",
  roof: "крыша",
  door: "дверь",
  fender: "крыло",
  trunk: "багажник",
  sill: "порог",
  pillar: "стойка",
};

const TILT: Record<ZoneId, number> = {
  hood: 4,
  roof: 0,
  door: -3,
  fender: 6,
  trunk: -5,
  sill: -2,
  pillar: 2,
};

/** кузов, вид сбоку, нос слева */
const BODY =
  "M24 196 L24 158 C25 147 33 141 46 138 L106 131 L134 128 L180 82 C188 76 198 73 210 73 L288 73 C302 73 312 77 320 85 L354 123 L422 131 C442 135 451 144 452 156 L452 196 Z";

type Z = { id: ZoneId; d: string; label: [number, number] };

const ZONES: Z[] = [
  { id: "hood", d: "M34 150 L110 141 L126 129 L44 137 Z", label: [78, 120] },
  { id: "fender", d: "M36 154 L108 145 L112 186 L44 188 Z", label: [70, 168] },
  { id: "door", d: "M140 118 L318 114 L320 174 L140 176 Z", label: [230, 150] },
  { id: "roof", d: "M182 84 L292 81 L296 71 L186 74 Z", label: [238, 62] },
  { id: "trunk", d: "M356 126 L420 134 L426 168 L356 164 Z", label: [390, 152] },
  { id: "sill", d: "M136 180 L322 178 L322 192 L136 194 Z", label: [228, 202] },
  { id: "pillar", d: "M128 130 L178 84 L188 90 L138 136 Z", label: [152, 100] },
];

export function CarMap({ zone }: { zone: string | null }) {
  const z = (zone as ZoneId) || null;

  return (
    <div className="cmap">
      <div className="cmap__stage">
        <motion.div
          className="cmap__car"
          animate={{ rotateZ: z ? TILT[z] : 0, y: z ? -3 : 0 }}
          transition={{ type: "spring", stiffness: 80, damping: 15 }}
        >
          <svg viewBox="0 0 480 240" fill="none">
            <defs>
              <linearGradient id="cmBody" x1="0.1" y1="0" x2="0.4" y2="1">
                <stop offset="0%" stopColor="#7d8d9a" />
                <stop offset="30%" stopColor="#4d5b66" />
                <stop offset="66%" stopColor="#2e3941" />
                <stop offset="100%" stopColor="#1a232a" />
              </linearGradient>
              <linearGradient id="cmGlass" x1="0" y1="0" x2="0.3" y2="1">
                <stop offset="0%" stopColor="rgba(190,225,248,0.42)" />
                <stop offset="100%" stopColor="rgba(96,140,172,0.16)" />
              </linearGradient>
              <linearGradient id="cmScan" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(255,77,23,0)" />
                <stop offset="50%" stopColor="rgba(255,77,23,0.18)" />
                <stop offset="100%" stopColor="rgba(255,77,23,0)" />
              </linearGradient>
              <filter id="cmGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <ellipse cx="240" cy="206" rx="215" ry="14" fill="rgba(0,0,0,0.5)" />

            <path d={BODY} fill="url(#cmBody)" stroke="rgba(255,255,255,0.34)" strokeWidth="1.8" />

            {/* поясная линия и блик */}
            <path d="M40 152 L128 140 L322 132 L448 150" stroke="rgba(255,255,255,0.16)" strokeWidth="1.2" />
            <path d="M60 168 C160 158 300 156 420 162" stroke="rgba(255,255,255,0.07)" strokeWidth="10" strokeLinecap="round" />

            {/* стёкла */}
            <path d="M140 126 L182 88 L228 86 L228 124 Z" fill="url(#cmGlass)" stroke="rgba(255,255,255,0.2)" />
            <path d="M236 86 L288 86 L316 122 L236 124 Z" fill="url(#cmGlass)" stroke="rgba(255,255,255,0.2)" />

            {/* двери, ручки, зеркало */}
            <path d="M232 126 L232 182" stroke="rgba(0,0,0,0.45)" strokeWidth="1.6" />
            <path d="M136 130 L136 182" stroke="rgba(0,0,0,0.3)" strokeWidth="1.2" />
            <rect x="196" y="140" width="24" height="5" rx="2.5" fill="rgba(255,255,255,0.45)" />
            <rect x="252" y="138" width="24" height="5" rx="2.5" fill="rgba(255,255,255,0.38)" />
            <path d="M132 118 L152 116 L154 128 L134 130 Z" fill="#3d4a55" stroke="rgba(255,255,255,0.2)" />

            {/* фара и стоп */}
            <path d="M26 152 L48 148 L50 164 L26 166 Z" fill="rgba(255,244,214,0.85)" />
            <path d="M430 146 L450 150 L450 166 L430 162 Z" fill="rgba(255,64,54,0.8)" />

            {/* арки и колёса */}
            {[
              [112, 188],
              [372, 188],
            ].map(([cx, cy]) => (
              <g key={cx}>
                <circle cx={cx} cy={cy} r="44" fill="#0e1318" />
                <circle cx={cx} cy={cy} r="36" fill="#0a0d10" stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
                <circle cx={cx} cy={cy} r="20" fill="#1b232a" stroke="rgba(255,255,255,0.16)" />
                <circle cx={cx} cy={cy} r="7" fill="#39444e" />
              </g>
            ))}

            {ZONES.map((zn) => (
              <Zone key={zn.id} active={z === zn.id} d={zn.d} label={NAMES[zn.id]} at={zn.label} />
            ))}

            <rect className="cmap__scan" x="0" y="0" width="24" height="240" fill="url(#cmScan)" />
          </svg>
        </motion.div>
      </div>
      <p className="cmap__cap">{z ? CAPTIONS[z] : "Выберите зону — покажу её на схеме"}</p>
    </div>
  );
}

function Zone({
  active,
  d,
  label,
  at,
}: {
  active: boolean;
  d: string;
  label: string;
  at: [number, number];
}) {
  return (
    <motion.g initial={false} animate={{ opacity: active ? 1 : 0 }} transition={{ duration: 0.28 }}>
      <path d={d} fill="rgba(255,77,23,0.6)" stroke="rgba(255,180,130,1)" strokeWidth="2" filter="url(#cmGlow)" />
      <text
        x={at[0]}
        y={at[1]}
        textAnchor="middle"
        fontSize="16"
        fontWeight="700"
        fill="#fff"
        style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.55)", strokeWidth: 3 }}
      >
        {label}
      </text>
    </motion.g>
  );
}
