import { useEffect, useMemo, useRef, useState } from "react";
import { preset } from "../lib/preset";
import { calculate, rub, type Answers, type Rates } from "../lib/calc";
import { compressImage } from "../lib/api";

type EmbedCfg = {
  id: string;
  name: string;
  city: string;
  phone: string;
  master: string;
  accent: string;
};

/** Шаги, которые показываем в виджете: минимум, который реально влияет на вилку. */
const SHORT = ["zone", "size", "dent_class", "paint"] as const;

export default function Embed() {
  const id = (window.location.pathname.split("/")[2] || "").trim();
  const [cfg, setCfg] = useState<EmbedCfg | null>(null);
  const [fatal, setFatal] = useState("");
  const [answers, setAnswers] = useState<Answers>({
    zone: "door",
    size: "1_3",
    dent_class: "smooth",
    paint: "ok",
    access: "free",
    count: "1",
    urgency: "later",
    travel: "shop",
  });
  const [contact, setContact] = useState({ name: "", phone: "", comment: "" });
  const [photo, setPhoto] = useState("");
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/embed/${encodeURIComponent(id)}/config`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("404"))))
      .then((d: { embed: EmbedCfg }) => setCfg(d.embed))
      .catch(() => setFatal("Виджет не найден. Проверьте ссылку."));
  }, [id]);

  const rates = preset.base_rates as Rates;
  const result = useMemo(() => calculate(answers, rates), [answers, rates]);

  useEffect(() => {
    if (!cfg) return;
    document.documentElement.style.setProperty("--acc", cfg.accent || "#FF4D17");
  }, [cfg]);

  const pick = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      setPhoto(await compressImage(file, 1200, 0.7));
    } catch {
      setErrs((e) => ({ ...e, photo: "Не удалось открыть фото" }));
    }
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (contact.name.trim().length < 2) e.name = "Как к вам обращаться?";
    if (contact.phone.replace(/\D/g, "").length < 10) e.phone = "Телефон или Telegram";
    setErrs(e);
    if (Object.keys(e).length) return;

    setSending(true);
    try {
      const res = await fetch(`/api/embed/${encodeURIComponent(id)}/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          range: result.ok ? { low: result.low, high: result.high } : null,
          contact: { ...contact, address: "", comment: contact.comment },
          photos: photo ? [photo] : [],
          source: document.referrer || "embed",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setDone(true);
    } catch {
      setErrs({ form: "Не удалось отправить. Попробуйте ещё раз." });
    } finally {
      setSending(false);
    }
  };

  if (fatal) return <div className="embed embed--msg">{fatal}</div>;
  if (!cfg) return <div className="embed embed--msg">Загружаем…</div>;

  if (done) {
    return (
      <div className="embed embed--done">
        <div className="embed__mark">✓</div>
        <h2 className="embed__title">Заявка ушла мастеру</h2>
        <p className="embed__sub">
          {cfg.master ? `${cfg.master} свяжется` : "Мастер свяжется"} с вами в ближайшее время.
        </p>
        {result.ok && (
          <div className="embed__price">
            Предварительно: <b>{rub(result.low)} – {rub(result.high)} ₽</b>
          </div>
        )}
        <p className="embed__note">Цена уточняется после осмотра — вилка считается по зоне и размеру.</p>
      </div>
    );
  }

  return (
    <div className="embed">
      <header className="embed__head">
        <div>
          <div className="embed__brand">{cfg.name}</div>
          <div className="embed__city">{cfg.city} · ремонт вмятин без покраски</div>
        </div>
        <div className="embed__badge">за 30 секунд</div>
      </header>

      {SHORT.map((sid) => {
        const step = preset.steps.find((s) => s.id === sid)!;
        return (
          <section className="embed__group" key={sid}>
            <div className="embed__label">{step.title}</div>
            <div className="embed__chips">
              {step.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`chip ${answers[sid] === o.id ? "chip--on" : ""}`}
                  onClick={() => setAnswers((a) => ({ ...a, [sid]: o.id }))}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </section>
        );
      })}

      <div className="embed__price">
        {result.ok ? (
          <>
            Предварительно: <b>{rub(result.low)} – {rub(result.high)} ₽</b>
          </>
        ) : (
          <span className="embed__price--muted">
            {answers.paint === "damaged" ? "Только после осмотра" : "Выберите параметры"}
          </span>
        )}
      </div>

      <div className="embed__row">
        <input
          className={`embed__input ${errs.name ? "embed__input--err" : ""}`}
          placeholder="Имя"
          value={contact.name}
          onChange={(e) => setContact({ ...contact, name: e.target.value })}
          autoComplete="name"
        />
        <input
          className={`embed__input ${errs.phone ? "embed__input--err" : ""}`}
          placeholder="Телефон или Telegram"
          value={contact.phone}
          onChange={(e) => setContact({ ...contact, phone: e.target.value })}
          inputMode="tel"
          autoComplete="tel"
        />
      </div>
      {(errs.name || errs.phone) && <div className="embed__err">{errs.name || errs.phone}</div>}

      <div className="embed__row">
        <button type="button" className="embed__photo" onClick={() => fileRef.current?.click()}>
          {photo ? "Фото добавлено ✓" : "📷 Добавить фото вмятины"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => void pick(e.target.files)}
        />
        <button className="embed__submit" onClick={() => void submit()} disabled={sending} type="button">
          {sending ? "Отправляем…" : "Отправить мастеру"}
        </button>
      </div>

      {errs.form && <div className="embed__err">{errs.form}</div>}

      <p className="embed__note">
        Фото необязательно, но с ним мастер ответит точнее. Никакой покраски — только выправление металла.
      </p>
    </div>
  );
}
