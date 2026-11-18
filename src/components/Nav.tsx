import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { brand } from "../lib/preset";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav ${scrolled ? "nav--scrolled" : ""}`}>
      <div className="shell nav__inner">
        <Link to="/" className="brand" aria-label={`${brand.name} — на главную`}>
          <span className="brand__mark">Р</span>
          <span>
            {brand.name}
            <small>{brand.tagline}</small>
          </span>
        </Link>

        <nav className="nav__links" aria-label="Разделы">
          <a href="/#how">Как это работает</a>
          <a href="/#price">Цены</a>
          <a href="/#faq">Вопросы</a>
        </nav>

        <div className="nav__cta">
          <a className="nav__phone" href={brand.phoneHref}>
            {brand.phone}
          </a>
          {pathname !== "/calc" && (
            <Link to="/calc" className="btn btn--primary">
              Рассчитать цену
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
