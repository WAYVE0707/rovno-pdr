import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useBrand } from "../lib/config";
import { rub } from "../lib/calc";

type State = { range?: { low: number; high: number } | null };

export default function Thanks() {
  const brand = useBrand();
  const { state } = useLocation() as { state: State | null };
  const range = state?.range ?? null;

  return (
    <div className="thanks">
      <div className="shell" style={{ maxWidth: 640 }}>
        <motion.div
          className="thanks__badge"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          ✓
        </motion.div>

        <motion.h1
          className="h2"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
        >
          Заявка <em>у мастера</em>
        </motion.h1>

        <motion.p
          className="lead"
          style={{ margin: "18px auto 0" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          {brand.master} посмотрит фото и свяжется в течение 15 минут в рабочее время ({brand.hours}). Если
          удобнее — позвоните сами.
        </motion.p>

        {range && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            style={{
              marginTop: 26,
              border: "1px solid var(--line)",
              padding: "18px 20px",
              display: "inline-block",
            }}
          >
            <div className="range-box__label">Ваш диапазон</div>
            <div className="range-box__value">
              {rub(range.low)} – {rub(range.high)} ₽
            </div>
          </motion.div>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 34, flexWrap: "wrap" }}>
          <a href={brand.phoneHref} className="btn btn--primary">
            Позвонить мастеру
          </a>
          <Link to="/" className="btn btn--ghost">
            На главную
          </Link>
        </div>

        <p className="calc__hint" style={{ marginTop: 22 }}>
          Цена предварительная: точную сумму мастер подтвердит после осмотра. Осмотр бесплатный.
        </p>
      </div>
    </div>
  );
}
