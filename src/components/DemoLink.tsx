import { useMemo, useState } from "react";
import type { Settings } from "../lib/api";

/** Ссылка для переписки: мастер открывает и видит сайт со своим названием и городом. */
export function DemoLink({ settings }: { settings: Settings }) {
  const [name, setName] = useState(settings.brand?.name ?? "");
  const [city, setCity] = useState(settings.city ?? "");
  const [phone, setPhone] = useState(settings.phone ?? "");
  const [master, setMaster] = useState(settings.master ?? "");
  const [copied, setCopied] = useState(false);

  const link = useMemo(() => {
    const base = typeof window === "undefined" ? "" : window.location.origin;
    const q = new URLSearchParams();
    if (name.trim()) q.set("b", name.trim());
    if (city.trim()) q.set("c", city.trim());
    if (phone.trim()) q.set("p", phone.trim());
    if (master.trim()) q.set("m", master.trim());
    const qs = q.toString();
    return base + "/" + (qs ? "?" + qs : "");
  }, [name, city, phone, master]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* старый браузер — выдели вручную */
    }
  }

  return (
    <div>
      <div className="settings-grid">
        <div className="field">
          <label>Название мастерской</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Вмятины Нет" />
        </div>
        <div className="field">
          <label>Город</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ростов-на-Дону" />
        </div>
        <div className="field">
          <label>Телефон</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 918 123-45-67" />
        </div>
        <div className="field">
          <label>Имя мастера</label>
          <input value={master} onChange={(e) => setMaster(e.target.value)} placeholder="Сергей" />
        </div>
      </div>

      <div className="demo-link">
        <code>{link}</code>
        <div className="demo-link__actions">
          <button type="button" className="btn btn--primary" onClick={copy}>
            {copied ? "скопировано" : "скопировать"}
          </button>
          <a className="btn" href={link} target="_blank" rel="noreferrer">
            открыть
          </a>
        </div>
      </div>
      <p className="note" style={{ marginTop: 10 }}>
        Ссылка подменяет название, город, телефон и имя мастера прямо на сайте — мастер видит
        уже «свой» сайт. Параметры запоминаются в его браузере, чтобы не терялись при переходах.
      </p>
    </div>
  );
}
