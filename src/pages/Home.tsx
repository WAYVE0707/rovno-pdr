import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { HeroVisual } from "../components/HeroVisual";
import { HeroBackdrop } from "../components/HeroBackdrop";
import { Works } from "../components/Works";
import { Reveal, RevealLines } from "../components/Reveal";
import { Marquee } from "../components/Marquee";
import { PriceTable } from "../components/PriceTable";
import { Faq } from "../components/Faq";
import { useBrand } from "../lib/config";

const CARDS = [
  {
    n: "01",
    t: "Металл помнит форму",
    d: "При ударе металл вминается, а краска за счёт эластичности часто остаётся целой. Мастер возвращает панели заводскую геометрию точечно, изнутри.",
  },
  {
    n: "02",
    t: "Ни шпаклёвки, ни покраски",
    d: "Нет грунта, подбора цвета и сушки. Значит нет риска «пятна» на солнце и вопросов у покупателя при продаже: машина не крашена.",
  },
  {
    n: "03",
    t: "Быстро и без разбора",
    d: "Вмятину на двери убираю за 20–40 минут, град на капоте — за пару часов. Салон не разбирается, машина остаётся у вас.",
  },
];

const STEPS = [
  { n: "01", t: "Фото и параметры", d: "Отвечаете на 6 вопросов и прикладываете 3–5 фото. Занимает минуту." },
  { n: "02", t: "Вилка цены", d: "Сразу видите диапазон по прайсу — без «перезвоните, я посчитаю»." },
  { n: "03", t: "Подтверждение", d: "Мастер смотрит фото, уточняет доступ и подтверждает сумму и время." },
  { n: "04", t: "Ремонт", d: "Выезд к вам или бокс. 15–120 минут — и панель ровная, краска родная." },
];

export default function Home() {
  const brand = useBrand();
  return (
    <>
      <section className="hero">
        <HeroBackdrop />
        <div className="shell hero__grid">
          <div className="hero__copy">
            <Reveal y={14}>
              <span className="eyebrow">PDR · {brand.city} и область</span>
            </Reveal>

            <h1 className="display" style={{ marginTop: 18 }}>
              <RevealLines lines={["Уберите", "вмятину,", "не трогая"]} />
              <motion.span
                style={{ display: "block" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              >
                <em>краску</em>
              </motion.span>
            </h1>

            <Reveal delay={0.25}>
              <p className="lead" style={{ marginTop: 22 }}>
                Заводское покрытие остаётся на месте: без шпаклёвки, грунта и покраски. Цену считаю по фото
                за 60 секунд — вилку видите сразу, точную сумму подтверждаю после осмотра.
              </p>
            </Reveal>

            <Reveal delay={0.35}>
              <div className="hero__actions">
                <Link to="/calc" className="btn btn--primary btn--big">
                  Рассчитать цену
                  <span className="arrow">→</span>
                </Link>
                <a href={brand.phoneHref} className="btn btn--ghost btn--big">
                  Позвонить
                </a>
              </div>
              <p className="hero__note">
                Осмотр бесплатный. Если после осмотра цена не подойдёт — вы ничего не платите.
              </p>
            </Reveal>

            <Reveal delay={0.45}>
              <div className="hero__meta">
                <span>
                  <i className="dot" /> {brand.years} лет практики
                </span>
                <span>
                  <i className="dot" /> {brand.cars.toLocaleString("ru-RU")} машин
                </span>
                <span>
                  <i className="dot" /> гарантия 12 месяцев
                </span>
              </div>
            </Reveal>
          </div>

          <motion.div
            className="hero__visual"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <HeroVisual auto />
          </motion.div>
        </div>
      </section>

      <Marquee />

      <section className="section" id="how">
        <div className="shell">
          <Reveal>
            <span className="eyebrow">Что такое PDR</span>
            <h2 className="h2" style={{ marginTop: 16, maxWidth: "18ch" }}>
              Ремонт <em>без</em> малярки
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="lead" style={{ marginTop: 18 }}>
              PDR — Paintless Dent Repair. Технология, при которой металл выправляется изнутри, а лак
              остаётся заводским.
            </p>
          </Reveal>

          <div className="grid-3" style={{ marginTop: 44 }}>
            {CARDS.map((c, i) => (
              <Reveal key={c.n} delay={0.08 * i} className="card">
                <span className="card__num">{c.n}</span>
                <span className="card__title">{c.t}</span>
                <span className="card__text">{c.d}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--tight" id="works">
        <div className="shell">
          <Reveal>
            <span className="eyebrow">Работы</span>
            <h2 className="h2" style={{ marginTop: 16 }}>
              Наведите на фото — <em>вмятина уйдёт</em>
            </h2>
          </Reveal>
          <div style={{ marginTop: 30 }}>
            <Works />
          </div>
          <p className="note" style={{ marginTop: 18 }}>
            Наведите курсор или нажмите на фото — покажем результат.
          </p>
        </div>
      </section>

      <section className="section" id="price">
        <div className="shell">
          <div className="split" style={{ alignItems: "end" }}>
            <Reveal>
              <span className="eyebrow">Прайс</span>
              <h2 className="h2" style={{ marginTop: 16 }}>
                Сколько это <em>стоит</em>
              </h2>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="lead">
                Базовая цена за одну вмятину. Точную сумму считает калькулятор по вашим фото — это быстрее,
                чем ждать ответа в переписке.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.15} className="" >
            <div style={{ marginTop: 40 }}>
              <PriceTable />
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div style={{ marginTop: 26 }}>
              <Link to="/calc" className="btn btn--primary">
                Посчитать по фото <span className="arrow">→</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section section--tight">
        <div className="shell">
          <Reveal>
            <span className="eyebrow">Порядок работы</span>
            <h2 className="h2" style={{ marginTop: 16, maxWidth: "16ch" }}>
              Четыре шага <em>до</em> ровной панели
            </h2>
          </Reveal>
          <div className="steps" style={{ marginTop: 40 }}>
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={0.06 * i} className="step">
                <span className="step__n">{s.n}</span>
                <span className="step__t">{s.t}</span>
                <span className="step__d">{s.d}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="faq">
        <div className="shell split" style={{ alignItems: "start" }}>
          <Reveal>
            <span className="eyebrow">Вопросы</span>
            <h2 className="h2" style={{ marginTop: 16, maxWidth: "14ch" }}>
              Что обычно <em>спрашивают</em>
            </h2>
            <p className="lead" style={{ marginTop: 18 }}>
              Если ответа нет — напишите в Telegram или позвоните, отвечу сам, без диспетчеров.
            </p>
            <a href={brand.phoneHref} className="btn btn--ghost" style={{ marginTop: 22 }}>
              {brand.phone}
            </a>
          </Reveal>
          <Reveal delay={0.1}>
            <Faq />
          </Reveal>
        </div>
      </section>

      <section className="section section--tight" style={{ paddingBottom: 90 }}>
        <div className="shell">
          <Reveal>
            <div className="cta">
              <div className="cta__grid">
                <div>
                  <span className="eyebrow">60 секунд</span>
                  <h2 className="h2" style={{ marginTop: 16 }}>
                    Узнайте цену <em>сейчас</em>
                  </h2>
                  <p className="lead" style={{ marginTop: 16 }}>
                    Шесть вопросов и пара фото. Вилку увидите сразу, без звонка и ожидания.
                  </p>
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  <Link to="/calc" className="btn btn--primary btn--big btn--block">
                    Рассчитать <span className="arrow">→</span>
                  </Link>
                  <a href={brand.phoneHref} className="btn btn--ghost btn--block">
                    Позвонить мастеру
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
