import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { WorksUploader } from "../components/WorksUploader";
import { preset } from "../lib/preset";
import { label, rub } from "../lib/calc";
import {
  getSettings,
  listLeads,
  login,
  saveSettings,
  setLeadStatus,
  setToken,
  getToken,
  type Lead,
  type Settings,
  type BrandSettings,
} from "../lib/api";

function brandOf(s: Settings): BrandSettings {
  return {
    name: s.brand?.name ?? "РОВНО",
    tagline: s.brand?.tagline ?? "PDR-студия",
    master: s.master,
    city: s.city,
    phone: s.phone,
    telegram: s.brand?.telegram ?? "https://t.me/",
    hours: s.brand?.hours ?? "Ежедневно 9:00–21:00",
    years: s.brand?.years ?? 7,
    cars: s.brand?.cars ?? 0,
  };
}

const STATUS: Record<Lead["status"], string> = {
  new: "Новая",
  work: "В работе",
  done: "Сделка",
  lost: "Отказ",
};

const SIZE_KEYS = ["lt1", "1_3", "4_10", "11_20", "gt20"];
const CLASS_KEYS = ["smooth", "edge", "strip"];

export default function Admin() {
  const [authed, setAuthed] = useState(Boolean(getToken()));
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"leads" | "settings">("leads");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    try {
      const [l, s] = await Promise.all([listLeads(), getSettings()]);
      setLeads(l.leads);
      setSettings(s.settings);
      setAuthed(true);
    } catch {
      setAuthed(false);
      setToken("");
    }
  };

  useEffect(() => {
    if (authed) void load();
  }, [authed]);

  if (!authed) {
    return (
      <div className="admin">
        <div className="shell" style={{ maxWidth: 420 }}>
          <span className="eyebrow">Кабинет мастера</span>
          <h1 className="calc__title" style={{ margin: "16px 0 24px" }}>
            Вход
          </h1>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              try {
                const { token } = await login(password);
                setToken(token);
                setAuthed(true);
              } catch {
                setError("Неверный пароль");
              }
            }}
          >
            <div className="field">
              <label htmlFor="pass">Пароль</label>
              <input
                id="pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
              />
            </div>
            {error && <p className="err" style={{ marginBottom: 12 }}>{error}</p>}
            <button className="btn btn--primary btn--block" type="submit">
              Войти
            </button>
          </form>
          <p className="calc__hint" style={{ marginTop: 16 }}>
            Пароль по умолчанию — <span className="mono">admin</span>, меняется в настройках сервера.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin">
      <div className="shell">
        <div className="admin__head">
          <div>
            <span className="eyebrow">Кабинет мастера</span>
            <h1 className="calc__title" style={{ marginTop: 12 }}>
              Заявки <em>и настройки</em>
            </h1>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className={`btn ${tab === "leads" ? "btn--primary" : "btn--ghost"}`} onClick={() => setTab("leads")}>
              Заявки · {leads.length}
            </button>
            <button
              className={`btn ${tab === "settings" ? "btn--primary" : "btn--ghost"}`}
              onClick={() => setTab("settings")}
            >
              Настройки
            </button>
            <Link to="/" className="btn btn--ghost">
              На сайт
            </Link>
          </div>
        </div>

        {tab === "leads" && (
          <div className="leads">
            {leads.length === 0 && <div className="admin__empty">Пока нет заявок. Проверьте форму на сайте.</div>}
            {leads.map((lead) => (
              <div className="leadcard" key={lead.id}>
                {lead.photos[0] ? (
                  <img className="leadcard__photo" src={lead.photos[0]} alt="Фото вмятины" />
                ) : (
                  <div className="leadcard__photo" />
                )}
                <div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                    <span className="leadcard__price">
                      {lead.range ? `${rub(lead.range.low)} – ${rub(lead.range.high)} ₽` : "по осмотру"}
                    </span>
                    <span className={`status status--${lead.status}`}>{STATUS[lead.status]}</span>
                    <span style={{ fontSize: 12, color: "var(--muted-2)" }}>
                      {new Date(lead.createdAt).toLocaleString("ru-RU")}
                    </span>
                  </div>
                  <div style={{ marginTop: 6, fontWeight: 500 }}>
                    {lead.contact.name} · {lead.contact.phone}
                  </div>
                  <div className="leadcard__meta">
                    <span>{label("zone", lead.answers.zone)}</span>
                    <span>{label("size", lead.answers.size)}</span>
                    <span>{label("dent_class", lead.answers.dent_class)}</span>
                    <span>{label("count", lead.answers.count)}</span>
                    <span>{label("urgency", lead.answers.urgency)}</span>
                    {lead.contact.address && <span>{lead.contact.address}</span>}
                  </div>
                  {lead.contact.comment && (
                    <div style={{ marginTop: 8, fontSize: 13, color: "var(--muted)" }}>{lead.contact.comment}</div>
                  )}
                </div>
                <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
                  {(["work", "done", "lost"] as const).map((s) => (
                    <button
                      key={s}
                      className="btn btn--ghost"
                      style={{ padding: "7px 12px", fontSize: 12 }}
                      onClick={async () => {
                        await setLeadStatus(lead.id, s);
                        void load();
                      }}
                    >
                      {STATUS[s]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "settings" && settings && (
          <div>
            <h2 className="h3" style={{ margin: "0 0 12px" }}>
              Бренд на сайте
            </h2>
            <p className="note" style={{ marginBottom: 14 }}>
              Пока фото мастера не загружены, в блоке «Работы» показываются демонстрационные.
            </p>
            <div className="settings-grid">
              <div className="field">
                <label>Название</label>
                <input
                  value={settings.brand?.name ?? ""}
                  onChange={(e) =>
                    setSettings({ ...settings, brand: { ...brandOf(settings), name: e.target.value } })
                  }
                />
              </div>
              <div className="field">
                <label>Подпись под названием</label>
                <input
                  value={settings.brand?.tagline ?? ""}
                  onChange={(e) =>
                    setSettings({ ...settings, brand: { ...brandOf(settings), tagline: e.target.value } })
                  }
                />
              </div>
              <div className="field">
                <label>Часы работы</label>
                <input
                  value={settings.brand?.hours ?? ""}
                  onChange={(e) =>
                    setSettings({ ...settings, brand: { ...brandOf(settings), hours: e.target.value } })
                  }
                />
              </div>
              <div className="field">
                <label>Ссылка на Telegram</label>
                <input
                  value={settings.brand?.telegram ?? ""}
                  onChange={(e) =>
                    setSettings({ ...settings, brand: { ...brandOf(settings), telegram: e.target.value } })
                  }
                  placeholder="https://t.me/master"
                />
              </div>
            </div>

            <h2 className="h3" style={{ margin: "28px 0 12px" }}>
              Фото работ «до/после»
            </h2>
            <WorksUploader />

            <h2 className="h3" style={{ margin: "28px 0 12px" }}>
              Контакты и уведомления
            </h2>
            <div className="settings-grid">
              <div className="field">
                <label>Мастер</label>
                <input value={settings.master} onChange={(e) => setSettings({ ...settings, master: e.target.value })} />
              </div>
              <div className="field">
                <label>Город</label>
                <input value={settings.city} onChange={(e) => setSettings({ ...settings, city: e.target.value })} />
              </div>
              <div className="field">
                <label>Телефон</label>
                <input value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
              </div>
              <div className="field">
                <label>Telegram chat_id для заявок</label>
                <input
                  value={settings.telegramChatId}
                  onChange={(e) => setSettings({ ...settings, telegramChatId: e.target.value })}
                  placeholder="123456789"
                />
              </div>
            </div>

            <h2 className="h3" style={{ margin: "28px 0 12px" }}>
              Прайс за одну вмятину, ₽
            </h2>
            <div className="price">
              <div className="price__head">
                <span>Размер</span>
                {CLASS_KEYS.map((c) => (
                  <span key={c}>{preset.steps.find((s) => s.id === "dent_class")!.options.find((o) => o.id === c)?.label}</span>
                ))}
              </div>
              {SIZE_KEYS.map((size) => (
                <div className="price__row" key={size}>
                  <span>{preset.steps.find((s) => s.id === "size")!.options.find((o) => o.id === size)?.label}</span>
                  {CLASS_KEYS.map((c) => (
                    <span key={c}>
                      <input
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: "1px solid var(--line)",
                          padding: "8px 10px",
                          color: "var(--text)",
                        }}
                        value={settings.baseRates[c]?.[size] ?? ""}
                        onChange={(e) => {
                          const v = e.target.value === "" ? null : Number(e.target.value);
                          const rates = { ...settings.baseRates };
                          rates[c] = { ...(rates[c] ?? {}), [size]: v };
                          setSettings({ ...settings, baseRates: rates });
                        }}
                      />
                    </span>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 22, alignItems: "center" }}>
              <button
                className="btn btn--primary"
                onClick={async () => {
                  await saveSettings(settings);
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2000);
                }}
              >
                Сохранить
              </button>
              {saved && <span style={{ fontSize: 13, color: "var(--ok)" }}>Сохранено</span>}
              <button
                className="btn btn--ghost"
                onClick={() => {
                  setToken("");
                  setAuthed(false);
                }}
              >
                Выйти
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
