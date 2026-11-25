import { useEffect, useMemo, useState } from "react";
import { deleteEmbed, listEmbeds, probeBot, saveEmbed, type EmbedRec } from "../lib/api";

type Draft = {
  id: string;
  name: string;
  city: string;
  phone: string;
  master: string;
  botToken: string;
  chatId: string;
  accent: string;
};

const EMPTY: Draft = {
  id: "",
  name: "",
  city: "",
  phone: "",
  master: "",
  botToken: "",
  chatId: "",
  accent: "#FF4D17",
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 16)
    .replace(/[^a-z0-9-]/g, "") || "client";

export function EmbedBuilder() {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [list, setList] = useState<EmbedRec[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [probe, setProbe] = useState("");

  const origin = useMemo(() => window.location.origin, []);

  const reload = () => {
    listEmbeds()
      .then((d) => setList(d.embeds))
      .catch(() => setList([]));
  };

  useEffect(reload, []);

  const snippet = `<script src="${origin}/w.js" data-id="${draft.id || "ID"}" async></script>`;
  const directLink = `${origin}/embed/${draft.id || "ID"}`;

  const checkBot = async () => {
    setProbe("Проверяем…");
    try {
      const r = await probeBot(draft.botToken.trim());
      setDraft((d) => ({ ...d, chatId: r.chatId }));
      setProbe(`Бот на связи: ${r.title || r.chatId}`);
    } catch (e) {
      setProbe(String((e as Error).message || "").includes("start") ? "Напишите своему боту /start и нажмите снова" : "Токен не подошёл");
    }
  };

  const save = async () => {
    if (!draft.name.trim()) return setMsg("Укажите название мастера");
    setBusy(true);
    setMsg("");
    try {
      const id = draft.id || slug(draft.name);
      await saveEmbed({ ...draft, id });
      setDraft((d) => ({ ...d, id }));
      setMsg("Сохранено. Код ниже — его вставляют на сайт клиента.");
      reload();
    } catch (e) {
      setMsg("Не сохранилось: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg(`${what} скопирован`);
    } catch {
      setMsg("Не удалось скопировать — выделите вручную");
    }
  };

  const edit = (rec: EmbedRec) => {
    setDraft({
      id: rec.id,
      name: rec.name,
      city: rec.city,
      phone: rec.phone,
      master: rec.master,
      botToken: "",
      chatId: rec.chatId,
      accent: rec.accent || "#FF4D17",
    });
    setMsg(`Редактируем «${rec.name}». Токен вводите заново, если меняете бота.`);
  };

  return (
    <div className="embed-builder">
      <p className="note" style={{ marginBottom: 14 }}>
        Для мастеров, у которых уже есть сайт: на его страницу вставляется кнопка «Рассчитать цену», клиент считает
        вилку и оставляет телефон — заявка с фото приходит в Telegram мастера. Новый сайт не нужен.
      </p>

      <div className="settings-grid">
        <div className="field">
          <label>Название на виджете</label>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="КузовОк" />
        </div>
        <div className="field">
          <label>Город</label>
          <input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="Воронеж" />
        </div>
        <div className="field">
          <label>Телефон мастера</label>
          <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="+7 910 000-00-00" />
        </div>
        <div className="field">
          <label>Имя мастера</label>
          <input value={draft.master} onChange={(e) => setDraft({ ...draft, master: e.target.value })} placeholder="Александр" />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Токен бота клиента (создаёт сам в @BotFather)</label>
          <input
            value={draft.botToken}
            onChange={(e) => setDraft({ ...draft, botToken: e.target.value })}
            placeholder="123456789:AA..."
          />
        </div>
        <div className="field">
          <label>chat_id, куда слать заявки</label>
          <input value={draft.chatId} onChange={(e) => setDraft({ ...draft, chatId: e.target.value })} placeholder="нажмите «Проверить бота»" />
        </div>
        <div className="field">
          <label>Цвет кнопки</label>
          <input value={draft.accent} onChange={(e) => setDraft({ ...draft, accent: e.target.value })} placeholder="#FF4D17" />
        </div>
      </div>

      <div className="demo-link__actions" style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn--ghost" type="button" onClick={() => void checkBot()} disabled={!draft.botToken.trim()}>
          Проверить бота
        </button>
        <button className="btn btn--primary" type="button" onClick={() => void save()} disabled={busy}>
          {busy ? "Сохраняем…" : "Сохранить виджет"}
        </button>
        {draft.id && (
          <button className="btn btn--ghost" type="button" onClick={() => setDraft(EMPTY)}>
            Новый
          </button>
        )}
      </div>
      {probe && <p className="note" style={{ marginTop: 8 }}>{probe}</p>}
      {msg && <p className="note" style={{ marginTop: 8 }}>{msg}</p>}

      {draft.id && (
        <>
          <div className="field" style={{ marginTop: 16 }}>
            <label>Код для вставки на сайт клиента (перед &lt;/body&gt;)</label>
            <textarea readOnly rows={2} value={snippet} />
          </div>
          <div className="demo-link__actions" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <button className="btn btn--ghost" type="button" onClick={() => void copy(snippet, "Код")}>
              Скопировать код
            </button>
            <button className="btn btn--ghost" type="button" onClick={() => void copy(directLink, "Ссылка")}>
              Скопировать ссылку
            </button>
            <a className="btn btn--ghost" href={directLink} target="_blank" rel="noreferrer">
              Открыть виджет
            </a>
          </div>
          <p className="note" style={{ marginTop: 8 }}>
            Проще всего: откройте ссылку и скиньте её мастеру — если он не хочет трогать код, ставим виджет как
            отдельную страницу и ссылку с его сайта.
          </p>
        </>
      )}

      {list.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div className="step-label">Виджеты</div>
          {list.map((r) => (
            <div key={r.id} className="embed-row">
              <div>
                <b>{r.name}</b> <span className="note">{r.city} · {r.id}</span>
                <div className="note">{r.chatId ? `заявки → chat_id ${r.chatId}` : "chat_id не задан — заявки только в файл"}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn--ghost" type="button" onClick={() => edit(r)}>
                  Изменить
                </button>
                <button
                  className="btn btn--ghost"
                  type="button"
                  onClick={() => void deleteEmbed(r.id).then(reload)}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
