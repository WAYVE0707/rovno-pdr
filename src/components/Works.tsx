import { useState } from "react";
import { Reveal } from "./Reveal";
import { useConfig } from "../lib/config";

type Work = {
  title: string;
  meta: string;
  before: string;
  after: string;
};

/**
 * Демо-фото «до/после». Когда мастер загрузил свои работы в админке,
 * сервер отдаёт их в /api/config → works, и карточки подменяются автоматически.
 */
const DEMO: Work[] = [
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
  const { works } = useConfig();
  const [pinned, setPinned] = useState<number | null>(null);

  // Пары «до/после» из админки: w1→w2, w3→w4, w5→w6
  const list: Work[] = DEMO.map((d, i) => {
    const before = works?.[i * 2];
    const after = works?.[i * 2 + 1];
    return before && after ? { ...d, before, after } : d;
  });

  return (
    <div className="works">
      {list.map((w, i) => (
        <Reveal key={w.before} delay={i * 0.08}>
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
