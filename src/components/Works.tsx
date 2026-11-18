import { useState } from "react";
import { Reveal } from "./Reveal";

type Work = {
  title: string;
  meta: string;
  before: string;
  after: string;
};

/**
 * Демо-фото «до/после». При настройке под клиента заменяются на его работы:
 * достаточно положить файлы в public/works и поправить список ниже.
 */
const WORKS: Work[] = [
  {
    title: "Дверь, вмятина с заломом",
    meta: "35 мин · без покраски",
    before: "/works/demo/w1.jpg",
    after: "/works/demo/w2.jpg",
  },
  {
    title: "Капот, плавная вмятина",
    meta: "50 мин · после града",
    before: "/works/demo/w3.jpg",
    after: "/works/demo/w4.jpg",
  },
  {
    title: "Крыло, сложный дефект",
    meta: "1 ч 10 мин · с разметкой",
    before: "/works/demo/w5.jpg",
    after: "/works/demo/w6.jpg",
  },
];

export function Works() {
  const [pinned, setPinned] = useState<number | null>(null);

  return (
    <div className="works">
      {WORKS.map((w, i) => (
        <Reveal key={w.title} delay={i * 0.08}>
          <button
            type="button"
            className={"work" + (pinned === i ? " is-on" : "")}
            onClick={() => setPinned(pinned === i ? null : i)}
            aria-label={`${w.title}: показать результат`}
          >
            <span className="work__media">
              <img className="work__img" src={w.before} alt={`${w.title} — до`} loading="lazy" />
              <img className="work__img work__img--after" src={w.after} alt={`${w.title} — после`} loading="lazy" />
              <span className="work__tag work__tag--before">до</span>
              <span className="work__tag work__tag--after">после</span>
            </span>
            <span className="work__foot">
              <span className="work__title">{w.title}</span>
              <span className="work__meta">{w.meta}</span>
            </span>
          </button>
        </Reveal>
      ))}
    </div>
  );
}
