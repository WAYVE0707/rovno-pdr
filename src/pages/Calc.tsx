import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { preset } from "../lib/preset";
import { calculate, label, rub, type Answers } from "../lib/calc";
import { compressImage, submitLead } from "../lib/api";

const SCREENS = [
  { title: "Где вмятина", qs: ["zone", "size"], sub: "Выберите зону и примерный размер — этого хватит для вилки." },
  { title: "Характер повреждения", qs: ["dent_class", "paint"], sub: "Если сомневаетесь — выберите то, что ближе, мастер уточнит." },
  { title: "Условия работы", qs: ["access", "count", "urgency", "travel"], sub: "Это влияет на цену: доступ, количество и срочность." },
  { title: "Фото и контакты", qs: [], sub: "Фото — самое важное. Снимите под углом, чтобы был виден блик." },
];

const HINTS: Record<string, string> = {
  paint: "Проведите ногтем: если ноготь не цепляется за трещину — краска целая.",
  access: "Если не знаете — оставьте «доступ свободный», мастер уточнит.",
  count: "После града выбирайте «больше 6».",
};

const DRAFT_KEY = "smeta_draft";

export default function Calc() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [contact, setContact] = useState({ name: "", phone: "", address: "", comment: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as { answers?: Answers; contact?: typeof contact };
        if (d.answers) setAnswers(d.answers);
        if (d.contact) setContact(d.contact);
      }
    } catch {
      /* пустой черновик */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers, contact }));
  }, [answers, contact]);

  const result = useMemo(() => calculate(answers), [answers]);

  const setAnswer = (id: string, value: string) => setAnswers((a) => ({ ...a, [id]: value }));

  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = 5 - photos.length;
    const list = Array.from(files).slice(0, room);
    const next: string[] = [];
    for (const f of list) {
      try {
        next.push(await compressImage(f));
      } catch {
        /* пропускаем битый файл */
      }
    }
    setPhotos((p) => [...p, ...next]);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (contact.name.trim().length < 2) e.name = "Как к вам обращаться?";
    const digits = contact.phone.replace(/\D/g, "");
    if (digits.length < 10) e.phone = "Укажите телефон или Telegram для связи";
    if (photos.length === 0) e.photos = "Нужно хотя бы одно фото вмятины";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSending(true);
    try {
      await submitLead({
        answers,
        range: result.ok ? { low: result.low, high: result.high } : null,
        contact,
        photos,
        source: document.referrer || "direct",
      });
      localStorage.removeItem(DRAFT_KEY);
      navigate("/thanks", { state: { range: result.ok ? result : null } });
    } catch {
      setErrors({ form: "Не удалось отправить. Проверьте связь и попробуйте ещё раз." });
    } finally {
      setSending(false);
    }
  };

  const current = SCREENS[screen];
  const canNext = current.qs.every((q) => Boolean(answers[q]));
  const progress = ((screen + (screen === 3 ? 1 : 0.5)) / 4) * 100;

  return (
    <div className="calc">
      <div className="shell" style={{ maxWidth: 880 }}>
        <div className="calc__head">
          <div>
            <Link to="/" className="eyebrow" style={{ color: "var(--muted-2)" }}>
              ← на главную
            </Link>
            <h1 className="calc__title" style={{ marginTop: 14 }}>
              Расчёт <em>по фото</em>
            </h1>
          </div>
          <span className="mono" style={{ fontSize: 12, color: "var(--muted-2)" }}>
            шаг {screen + 1} / 4
          </span>
        </div>

        <div className="progress">
          <div className="progress__bar" style={{ width: `${progress}%` }} />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="step-label">
              {String(screen + 1).padStart(2, "0")} — {current.title}
            </span>
            <h2 className="question">{current.title}</h2>
            <p className="question-sub">{current.sub}</p>

            {current.qs.map((qid) => {
              const step = preset.steps.find((s) => s.id === qid)!;
              return (
                <div key={qid} style={{ marginBottom: 30 }}>
                  <span className="step-label">{step.title}</span>
                  {HINTS[qid] && (
                    <p style={{ fontSize: 12, color: "var(--muted-2)", marginBottom: 10 }}>{HINTS[qid]}</p>
                  )}
                  <div className="optgrid">
                    {step.options.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        className={`opt ${answers[qid] === o.id ? "opt--on" : ""}`}
                        onClick={() => setAnswer(qid, o.id)}
                        style={{ position: "relative" }}
                      >
                        <span className="opt__label">{o.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {screen === 3 && (
              <>
                <span className="step-label">Фото вмятины · до 5 штук</span>
                <div
                  className={`drop ${over ? "drop--over" : ""}`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOver(true);
                  }}
                  onDragLeave={() => setOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setOver(false);
                    void pick(e.dataTransfer.files);
                  }}
                >
                  <div className="drop__t">Перетащите фото или нажмите</div>
                  <div className="drop__d">JPG или PNG · сжимаем на телефоне, чтобы не тратить трафик</div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => void pick(e.target.files)}
                  />
                </div>
                {errors.photos && <p className="err" style={{ marginTop: 8 }}>{errors.photos}</p>}

                {photos.length > 0 && (
                  <div className="thumbs">
                    {photos.map((src, i) => (
                      <div className="thumb" key={i}>
                        <img src={src} alt={`Фото ${i + 1}`} />
                        <button
                          type="button"
                          aria-label="Удалить фото"
                          onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 30 }}>
                  <div className="two">
                    <div className={`field ${errors.name ? "field--err" : ""}`}>
                      <label htmlFor="name">Имя</label>
                      <input
                        id="name"
                        value={contact.name}
                        onChange={(e) => setContact({ ...contact, name: e.target.value })}
                        placeholder="Как к вам обращаться"
                        autoComplete="name"
                      />
                      {errors.name && <span className="err">{errors.name}</span>}
                    </div>
                    <div className={`field ${errors.phone ? "field--err" : ""}`}>
                      <label htmlFor="phone">Телефон или Telegram</label>
                      <input
                        id="phone"
                        value={contact.phone}
                        onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                        placeholder="+7 900 000-00-00"
                        inputMode="tel"
                        autoComplete="tel"
                      />
                      {errors.phone && <span className="err">{errors.phone}</span>}
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="address">Город и адрес</label>
                    <input
                      id="address"
                      value={contact.address}
                      onChange={(e) => setContact({ ...contact, address: e.target.value })}
                      placeholder="Где стоит машина"
                      autoComplete="street-address"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="comment">Комментарий</label>
                    <textarea
                      id="comment"
                      rows={3}
                      value={contact.comment}
                      onChange={(e) => setContact({ ...contact, comment: e.target.value })}
                      placeholder="Например: вмятина на двери, краска целая, нужен выезд сегодня"
                    />
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {errors.form && <p className="err" style={{ marginTop: 16 }}>{errors.form}</p>}

        <div className="range-box">
          <div>
            <div className="range-box__label">Предварительная цена</div>
            <div className="range-box__value">
              {result.ok ? (
                <>
                  {rub(result.low)} – {rub(result.high)} ₽ <small>за работу</small>
                </>
              ) : (
                <span style={{ fontSize: "1rem", color: "var(--muted)" }}>
                  {answers.paint === "damaged" ? "Только после осмотра" : "Ответьте на вопросы"}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {screen > 0 && (
              <button className="btn btn--ghost" onClick={() => setScreen((s) => s - 1)} type="button">
                Назад
              </button>
            )}
            {screen < 3 ? (
              <button
                className="btn btn--primary"
                disabled={!canNext}
                onClick={() => setScreen((s) => s + 1)}
                type="button"
              >
                Далее <span className="arrow">→</span>
              </button>
            ) : (
              <button className="btn btn--primary" onClick={() => void submit()} disabled={sending} type="button">
                {sending ? "Отправляем…" : "Отправить мастеру"}
              </button>
            )}
          </div>
        </div>

        {!result.ok && screen === 3 && (
          <p className="calc__hint" style={{ marginTop: 12 }}>
            {answers.paint === "damaged"
              ? "Краска повреждена — цену назовёт мастер после осмотра. Заявку всё равно отправьте."
              : ""}
          </p>
        )}

        {result.ok && (
          <p className="calc__hint" style={{ marginTop: 12 }}>
            {preset.brand.disclaimer} {label("zone", answers.zone)} · {label("size", answers.size)} ·{" "}
            {label("dent_class", answers.dent_class)}
          </p>
        )}
      </div>
    </div>
  );
}
