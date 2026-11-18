// Проверка команд бота без Telegram: подменяем fetch и кормим апдейты.
import fs from "node:fs";
import path from "node:path";
import { startBot } from "../server/bot.mjs";

const ROOT = "C:/Users/RX 550/Projects/SmetaOnline";
const LEADS = path.join(ROOT, "data", "leads.json");
const SETTINGS = path.join(ROOT, "data", "settings.json");

const backupLeads = fs.existsSync(LEADS) ? fs.readFileSync(LEADS, "utf8") : null;
const backupSettings = fs.existsSync(SETTINGS) ? fs.readFileSync(SETTINGS, "utf8") : null;

const now = new Date().toISOString();
fs.writeFileSync(
  LEADS,
  JSON.stringify(
    [
      { id: "t1", createdAt: now, range: { low: 2500, high: 3500 }, contact: { name: "Игорь", phone: "+7 918 000-11-22" }, answers: {} },
      { id: "t2", createdAt: now, range: { low: 4000, high: 5000 }, contact: { name: "Марина", phone: "+7 918 000-33-44" }, answers: {} },
      { id: "t3", createdAt: "2020-01-01T10:00:00.000Z", range: { low: 6000, high: 8000 }, contact: { name: "Старая", phone: "+7 900 000-00-00" }, answers: {} },
    ],
    null,
    2,
  ),
);
fs.writeFileSync(
  SETTINGS,
  JSON.stringify({ telegramChatId: "1227620433", brand: { name: "РОВНО", tagline: "PDR-студия", master: "Артём", phone: "+7 900 000-00-00", city: "Краснодар" }, baseRates: { lt1: { smooth: 2000, edge: 2600, strip: 3200 }, "1_3": { smooth: 3000 } } }, null, 2),
);

const sent = [];
let queue = [];
const json = (o) => ({ ok: true, json: async () => o, status: 200 });

globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes("getMe")) return json({ ok: true, result: { username: "rovno_test_bot" } });
  if (u.includes("getUpdates")) {
    if (queue.length) return json({ ok: true, result: [queue.shift()] });
    await new Promise((r) => setTimeout(r, 60));
    return json({ ok: true, result: [] });
  }
  if (u.includes("sendMessage")) {
    sent.push(JSON.parse(opts.body));
    return json({ ok: true, result: {} });
  }
  return json({ ok: true, result: {} });
};

const bot = startBot({ token: "test", base: "https://tg.test/botTEST", ownerChatId: "1227620433" });

const msg = (text, chat = 1227620433) => ({
  update_id: Math.floor(Math.random() * 1e6),
  message: { chat: { id: chat }, from: { first_name: "Андрей" }, text },
});

queue = [msg("/start"), msg("/leads"), msg("/today"), msg("/settings"), msg("/leads", 999)];

await new Promise((r) => setTimeout(r, 2500));
bot.stop();

console.log("--- ответов:", sent.length, "---");
for (const s of sent) console.log(`[chat ${s.chat_id}]\n${s.text}\n`);

// восстановление данных
if (backupLeads !== null) fs.writeFileSync(LEADS, backupLeads);
else fs.rmSync(LEADS, { force: true });
if (backupSettings !== null) fs.writeFileSync(SETTINGS, backupSettings);
else fs.rmSync(SETTINGS, { force: true });
console.log("данные восстановлены");
