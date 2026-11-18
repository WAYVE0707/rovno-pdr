import { preset } from "../lib/preset";
import { rub } from "../lib/calc";

const SIZE_LABELS: Record<string, string> = {
  lt1: "до 1 см",
  "1_3": "1–3 см",
  "4_10": "4–10 см",
  "11_20": "11–20 см",
  gt20: "больше 20 см",
};

const CLASSES = ["smooth", "edge", "strip"] as const;
const CLASS_LABELS: Record<string, string> = {
  smooth: "Плавная",
  edge: "На ребре",
  strip: "Полоса",
};

function cell(value: number | null | undefined) {
  if (value === null || value === undefined) return "по осмотру";
  return `от ${rub(value)}`;
}

export function PriceTable() {
  return (
    <div>
      <div className="price">
        <div className="price__head">
          <span>Размер вмятины</span>
          {CLASSES.map((c) => (
            <span key={c}>{CLASS_LABELS[c]}</span>
          ))}
        </div>
        {Object.keys(SIZE_LABELS).map((size) => (
          <div className="price__row" key={size}>
            <span>{SIZE_LABELS[size]}</span>
            {CLASSES.map((c) => (
              <span key={c}>{cell(preset.base_rates[c]?.[size])}</span>
            ))}
          </div>
        ))}
      </div>
      <p className="price__note">
        Цены за одну вмятину без покраски. Крыша и стойки — дороже: там металл жёстче и доступ сложнее.
        Итог зависит от доступа к обратной стороне панели и количества вмятин.
      </p>
    </div>
  );
}
