const ITEMS = [
  "без покраски",
  "заводское ЛКП",
  "15–120 минут",
  "выезд по городу",
  "гарантия на работу",
  "отчёт по каждому этапу",
];

export function Marquee() {
  const row = [...ITEMS, ...ITEMS, ...ITEMS, ...ITEMS];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">
        {row.map((t, i) => (
          <span className="marquee__item" key={i}>
            <b>{t}</b>
            <span className="dot" />
          </span>
        ))}
      </div>
    </div>
  );
}
