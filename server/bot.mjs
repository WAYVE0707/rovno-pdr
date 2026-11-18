import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const LEADS = path.join(ROOT, "data", "leads.json");
const SETTINGS = path.join(ROOT, "data", "settings.json");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

const rub = (n) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;
const pad = (n) => String(n).padStart(2, "0");

function dayKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Команды мастера в Telegram. Long polling, без webhook —
 * работает и на Render, и на VPS, и за NAT.
 */
export function startBot({ token, base, ownerChatId }) {
  if (!token) {
    console.log("ℹ TELEGRAM_BOT_TOKEN не задан — команды бота отключены");
    return { stop() {} };
  }

  let offset = 0;
  let stopped = false;
  let me = null;

  const api = (method) => `${base}/${method}`;

  async function call(method, payload) {
    const r = await fetch(api(method), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    if (!data.ok) throw new Error(`${method}: ${data.description || r.status}`);
    return data.result;
  }

  const send = (chatId, text) =>
    call("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true }).catch((e) =>
      console.log("⚠ не смог ответить в Telegram:", e.message),
    );

  const leads = () => readJson(LEADS, []).slice().reverse();

  const owner = () => readJson(SETTINGS, {}).telegramChatId || ownerChatId || "";

  function isOwner(chatId) {
    const o = owner();
    // пока chat_id не задан, разрешаем первичную настройку из любого чата
    return !o || String(o) === String(chatId);
  }

  const commands = {
    async start(chatId, user) {
      const o = owner();
      if (!o) {
        await send(
          chatId,
          [
            `Привет, ${user.first_name || "мастер"}!`,
            "",
            "Это бот заявок с сайта. Ваш chat_id:",
            `<code>${chatId}</code>`,
            "",
            "Вставьте его в админке → Настройки → «Chat ID для заявок»,",
            "и бот начнёт присылать сюда новые заявки с фото.",
          ].join("\n"),
        );
        return;
      }
      await send(
        chatId,
        [
          "Бот заявок на месте.",
          "",
          "/leads — последние 5 заявок",
          "/today — сколько пришло за сегодня",
          "/settings — название, телефон и цены",
          "/help — эта справка",
        ].join("\n"),
      );
    },

    async leads(chatId) {
      const list = leads().slice(0, 5);
      if (!list.length) return send(chatId, "Заявок пока нет.");
      const lines = list.map((l, i) => {
        const when = new Date(l.createdAt);
        const time = `${pad(when.getDate())}.${pad(when.getMonth() + 1)} ${pad(when.getHours())}:${pad(when.getMinutes())}`;
        const price = l.range ? `${l.range.low}–${l.range.high} ₽` : "по осмотру";
        const who = l.contact?.name || "без имени";
        return `${i + 1}. ${time} · ${price}\n   ${who} · ${l.contact?.phone || "—"}`;
      });
      return send(chatId, ["Последние заявки:", "", ...lines].join("\n"));
    },

    async today(chatId) {
      const key = dayKey(new Date().toISOString());
      const list = leads().filter((l) => dayKey(l.createdAt) === key);
      if (!list.length) return send(chatId, "Сегодня заявок ещё нет.");
      const low = list.reduce((s, l) => s + (l.range?.low || 0), 0);
      const high = list.reduce((s, l) => s + (l.range?.high || 0), 0);
      return send(
        chatId,
        [
          `Сегодня: ${list.length} ${plural(list.length, "заявка", "заявки", "заявок")}`,
          `Сумма вилок: ${rub(low)} – ${rub(high)}`,
        ].join("\n"),
      );
    },

    async settings(chatId) {
      const s = readJson(SETTINGS, {});
      const b = s.brand || {};
      const rates = s.baseRates || {};
      const rows = Object.entries(rates).slice(0, 4).map(([k, v]) => {
        const r = v?.smooth ?? Object.values(v || {})[0];
        return `· ${k}: ${r ? rub(r) : "—"}`;
      });
      return send(
        chatId,
        [
          `Сайт: ${b.name || "—"} · ${b.tagline || ""}`,
          `Мастер: ${b.master || "—"} · ${b.phone || "—"}`,
          `Город: ${b.city || "—"}`,
          "",
          "Базовые ставки:",
          ...rows,
          "",
          "Меняются в админке → Настройки.",
        ].join("\n"),
      );
    },

    async help(chatId) {
      return send(
        chatId,
        [
          "/leads — последние 5 заявок",
          "/today — заявки и сумма за сегодня",
          "/settings — бренд и прайс",
          "",
          "Заявка приходит автоматически: вилка, зона, контакт и фото.",
        ].join("\n"),
      );
    },
  };

  async function handle(update) {
    const msg = update.message || update.edited_message;
    if (!msg?.text) return;
    const chatId = msg.chat.id;
    const text = msg.text.trim();
    if (!text.startsWith("/")) return;

    const name = text.split(/[\s@]/)[0].slice(1).toLowerCase();
    if (!isOwner(chatId)) {
      return send(chatId, "Это бот чужой мастерской. Заявки доступны только владельцу.");
    }
    const fn = commands[name];
    if (!fn) return send(chatId, "Не знаю такую команду. /help");
    try {
      await fn(chatId, msg.from || {});
    } catch (e) {
      console.log("⚠ команда", name, "упала:", e.message);
      await send(chatId, "Что-то пошло не так, попробуйте ещё раз.");
    }
  }

  async function loop() {
    // знакомимся с ботом, чтобы в логе было видно, кто подключён
    try {
      me = await call("getMe", {});
      console.log(`🤖 бот @${me.username} на связи`);
    } catch (e) {
      console.log("⚠ Telegram недоступен для бота:", e.message);
    }

    while (!stopped) {
      try {
        const r = await fetch(`${api("getUpdates")}?offset=${offset}&timeout=25`, {
          signal: AbortSignal.timeout(40000),
        });
        const data = await r.json();
        if (!data.ok) throw new Error(data.description || r.status);
        for (const u of data.result || []) {
          offset = u.update_id + 1;
          await handle(u);
        }
      } catch (e) {
        if (stopped) break;
        console.log("⚠ опрос Telegram:", e.message);
        await sleep(8000);
      }
    }
  }

  loop();
  return {
    stop() {
      stopped = true;
    },
  };
}

function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}
