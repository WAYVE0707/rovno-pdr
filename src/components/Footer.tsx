import { Link } from "react-router-dom";
import { brand } from "../lib/preset";

export function Footer() {
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer__grid">
          <div>
            <div className="brand" style={{ marginBottom: 14 }}>
              <span className="brand__mark">Р</span>
              <span>
                {brand.name}
                <small>{brand.tagline}</small>
              </span>
            </div>
            <p style={{ maxWidth: "34ch", lineHeight: 1.7 }}>
              Удаление вмятин без покраски. Выезд по {brand.city}у и области, работа в боксе.
            </p>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "var(--muted)", letterSpacing: "0.16em", fontSize: 10, textTransform: "uppercase" }}>
              Контакты
            </span>
            <a href={brand.phoneHref} style={{ fontSize: 16, color: "var(--text)" }}>
              {brand.phone}
            </a>
            <span>{brand.hours}</span>
            <span>{brand.city}</span>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ color: "var(--muted)", letterSpacing: "0.16em", fontSize: 10, textTransform: "uppercase" }}>
              Разделы
            </span>
            <Link to="/calc">Рассчитать цену</Link>
            <a href="/#price">Прайс</a>
            <a href="/#faq">Вопросы</a>
            <Link to="/admin">Кабинет мастера</Link>
          </div>
        </div>

        <div className="footer__bottom">
          <span>© {new Date().getFullYear()} {brand.name}. Самозанятый, чек по каждому заказу.</span>
          <span>Цены на сайте предварительные и не являются публичной офертой.</span>
        </div>
      </div>
    </footer>
  );
}
