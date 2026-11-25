import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import express from "express";
import { startBot } from "./bot.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "data");
const PHOTOS = path.join(DATA, "photos");
const LEADS = path.join(DATA, "leads.json");
const SETTINGS = path.join(DATA, "settings.json");
const WORKS = path.join(DATA, "works");
const EMBEDS = path.join(DATA, "embeds.json");
const EMBED_LEADS = path.join(DATA, "embed-leads.json");
const DIST = path.join(ROOT, "dist");
const PORT = Number(process.env.PORT || 8787);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
// если провайдер режет api.telegram.org, можно указать рабочий IP
const TG_IP = process.env.TELEGRAM_API_IP || "";
const TG_BASE = TG_IP ? `https://${TG_IP}/bot${BOT_TOKEN}` : `https://api.telegram.org/bot${BOT_TOKEN}`;
const SECRET = process.env.TOKEN_SECRET || "smeta-local-secret";
// опрос Telegram должен идти только с одного сервера, иначе 409 Conflict
const BOT_POLLING = process.env.BOT_POLLING !== "0";

fs.mkdirSync(PHOTOS, { recursive: true });
fs.mkdirSync(WORKS, { recursive: true });

const preset = JSON.parse(fs.readFileSync(path.join(ROOT, "presets", "pdr.json"), "utf8"));

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

function defaultSettings() {
  return {
    master: "Артём",
    city: "Краснодар",
    phone: "+7 900 000-00-00",
    telegramChatId: "",
    baseRates: preset.base_rates,
    brand: {
      name: "РОВНО",
      tagline: "PDR-студия",
      master: "Артём",
      city: "Краснодар",
      phone: "+7 900 000-00-00",
      telegram: "https://t.me/",
      hours: "Ежедневно 9:00–21:00",
      years: 7,
      cars: 4200,
    },
  };
}

/** Публичная конфигурация: то, что видят клиенты на сайте. */
function worksList() {
  const out = [];
  for (let i = 1; i <= 6; i++) {
    const file = path.join(WORKS, `w${i}.jpg`);
    if (!fs.existsSync(file)) continue;
    out.push(`/works/w${i}.jpg?v=${Math.round(fs.statSync(file).mtimeMs / 1000)}`);
  }
  return out.length ? out : null;
}

function publicConfig() {
  const s = readJson(SETTINGS, defaultSettings());
  const brand = { ...defaultSettings().brand, ...(s.brand ?? {}) };
  brand.master = s.master ?? brand.master;
  brand.city = s.city ?? brand.city;
  brand.phone = s.phone ?? brand.phone;
  return { brand, rates: s.baseRates ?? preset.base_rates, works: worksList() };
}

if (!fs.existsSync(LEADS)) writeJson(LEADS, []);
if (!fs.existsSync(SETTINGS)) writeJson(SETTINGS, defaultSettings());

const token = crypto.createHmac("sha256", SECRET).update(ADMIN_PASSWORD).digest("hex");

function auth(req, res, next) {
  const header = req.get("authorization") || "";
  const given = header.replace(/^Bearer\s+/i, "");
  if (given && given.length === token.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(token))) {
    return next();
  }
  res.status(401).json({ error: "unauthorized" });
}

const app = express();
// Render/Caddy стоят перед нами: без этого req.protocol всегда http
app.set("trust proxy", 1);
app.use(express.json({ limit: "30mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/config", (_req, res) => res.json(publicConfig()));

app.post("/api/login", (req, res) => {
  const { password } = req.body ?? {};
  if (typeof password !== "string" || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "bad password" });
  }
  res.json({ token });
});

function labelOf(stepId, optionId) {
  const step = preset.steps.find((s) => s.id === stepId);
  const opt = step?.options.find((o) => o.id === optionId);
  return opt?.label ?? "—";
}

app.post("/api/leads", async (req, res) => {
  const body = req.body ?? {};
  const answers = body.answers ?? {};
  const contact = body.contact ?? {};
  const photos = Array.isArray(body.photos) ? body.photos.slice(0, 5) : [];

  if (typeof contact.name !== "string" || contact.name.trim().length < 2) {
    return res.status(400).json({ error: "name required" });
  }
  const digits = String(contact.phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return res.status(400).json({ error: "phone required" });

  const id = crypto.randomUUID();
  const saved = [];
  photos.forEach((dataUrl, i) => {
    const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(String(dataUrl));
    if (!m) return;
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > 6 * 1024 * 1024) return;
    const file = `${id}-${i}.${m[1] === "jpeg" ? "jpg" : m[1]}`;
    fs.writeFileSync(path.join(PHOTOS, file), buf);
    saved.push(`/uploads/${file}`);
  });

  const range =
    body.range && Number.isFinite(body.range.low) && Number.isFinite(body.range.high)
      ? { low: Math.round(body.range.low), high: Math.round(body.range.high) }
      : null;

  const lead = {
    id,
    createdAt: new Date().toISOString(),
    status: "new",
    answers,
    range,
    contact: {
      name: contact.name.trim().slice(0, 80),
      phone: String(contact.phone).trim().slice(0, 40),
      address: String(contact.address ?? "").slice(0, 200),
      comment: String(contact.comment ?? "").slice(0, 1000),
    },
    photos: saved,
    source: String(body.source ?? "direct").slice(0, 200),
  };

  const leads = readJson(LEADS, []);
  leads.unshift(lead);
  writeJson(LEADS, leads);

  res.json({ ok: true, id });

  // уведомление в Telegram — не блокирует ответ клиенту
  notifyTelegram(lead).catch((e) => console.warn("telegram:", e.message));
});

app.get("/api/leads", auth, (_req, res) => res.json({ leads: readJson(LEADS, []) }));

app.patch("/api/leads/:id", auth, (req, res) => {
  const leads = readJson(LEADS, []);
  const lead = leads.find((l) => l.id === req.params.id);
  if (!lead) return res.status(404).json({ error: "not found" });
  const status = req.body?.status;
  if (!["new", "work", "done", "lost"].includes(status)) {
    return res.status(400).json({ error: "bad status" });
  }
  lead.status = status;
  writeJson(LEADS, leads);
  res.json({ ok: true });
});

app.get("/api/settings", auth, (_req, res) => res.json({ settings: readJson(SETTINGS, defaultSettings()) }));

app.put("/api/settings", auth, (req, res) => {
  const current = readJson(SETTINGS, defaultSettings());
  const next = req.body?.settings ?? req.body ?? {};
  const brandIn = next.brand ?? {};
  const brand = {
    ...(current.brand ?? defaultSettings().brand),
    ...Object.fromEntries(
      ["name", "tagline", "master", "city", "phone", "telegram", "hours"].map((k) => [
        k,
        String(brandIn[k] ?? current.brand?.[k] ?? defaultSettings().brand[k]).slice(0, 120),
      ]),
    ),
    years: Number(brandIn.years ?? current.brand?.years ?? defaultSettings().brand.years) || 0,
    cars: Number(brandIn.cars ?? current.brand?.cars ?? defaultSettings().brand.cars) || 0,
  };

  const merged = {
    ...current,
    master: String(next.master ?? brand.master ?? current.master).slice(0, 60),
    city: String(next.city ?? brand.city ?? current.city).slice(0, 60),
    phone: String(next.phone ?? brand.phone ?? current.phone).slice(0, 40),
    telegramChatId: String(next.telegramChatId ?? current.telegramChatId).slice(0, 40),
    baseRates: next.baseRates ?? current.baseRates,
    brand,
  };
  writeJson(SETTINGS, merged);
  res.json({ ok: true });
});

/* ───────────── Виджет «калькулятор + бот» для чужого сайта ───────────── */

if (!fs.existsSync(EMBEDS)) writeJson(EMBEDS, []);

// демо-виджет: всегда существует, чтобы страница /demo-embed.html работала на свежем сервере
if (!readJson(EMBEDS, []).some((e) => e.id === "demo")) {
  const list = readJson(EMBEDS, []);
  const b = readJson(SETTINGS, defaultSettings()).brand ?? defaultSettings().brand;
  list.push({
    id: "demo",
    name: b.name || "РОВНО",
    city: b.city || "Краснодар",
    phone: b.phone || "",
    master: b.master || "",
    chatId: process.env.TELEGRAM_CHAT_ID || "",
    botToken: "",
    accent: "#FF4D17",
    createdAt: new Date().toISOString(),
    demo: true,
  });
  writeJson(EMBEDS, list);
}
if (!fs.existsSync(EMBED_LEADS)) writeJson(EMBED_LEADS, []);

const embedHits = new Map();

function readEmbeds() {
  return readJson(EMBEDS, []);
}

function findEmbed(id) {
  return readEmbeds().find((e) => e.id === id) ?? null;
}

function publicEmbed(e) {
  return { id: e.id, name: e.name, city: e.city, phone: e.phone, master: e.master, accent: e.accent || "#FF6A1A" };
}

function maskEmbed(e) {
  return { ...e, botToken: e.botToken ? "***" : "" };
}

function tgBase(token) {
  return TG_IP ? `https://${TG_IP}/bot${token}` : `https://api.telegram.org/bot${token}`;
}

/** Публичная конфигурация виджета: бренд клиента + его прайс. */
app.get("/api/embed/:id/config", (req, res) => {
  const e = findEmbed(String(req.params.id));
  if (!e) return res.status(404).json({ error: "not found" });
  res.json({ embed: publicEmbed(e), rates: preset.base_rates });
});

/** Заявка из виджета: сохраняем и пересылаем в Telegram клиента. */
app.post("/api/embed/:id/lead", async (req, res) => {
  const e = findEmbed(String(req.params.id));
  if (!e) return res.status(404).json({ error: "not found" });

  const now = Date.now();
  const hits = embedHits.get(e.id) ?? { count: 0, ts: now };
  if (now - hits.ts > 10 * 60 * 1000) {
    hits.count = 0;
    hits.ts = now;
  }
  if (hits.count >= 12) return res.status(429).json({ error: "too many" });
  hits.count += 1;
  embedHits.set(e.id, hits);

  const body = req.body ?? {};
  const answers = body.answers ?? {};
  const contact = body.contact ?? {};
  const photos = Array.isArray(body.photos) ? body.photos.slice(0, 5) : [];

  if (typeof contact.name !== "string" || contact.name.trim().length < 2) {
    return res.status(400).json({ error: "name required" });
  }
  const digits = String(contact.phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return res.status(400).json({ error: "phone required" });

  const id = crypto.randomUUID();
  const saved = [];
  photos.forEach((dataUrl, i) => {
    const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(String(dataUrl));
    if (!m) return;
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > 6 * 1024 * 1024) return;
    const file = `${id}-${i}.${m[1] === "jpeg" ? "jpg" : m[1]}`;
    fs.writeFileSync(path.join(PHOTOS, file), buf);
    saved.push(`/uploads/${file}`);
  });

  const range =
    body.range && Number.isFinite(body.range.low) && Number.isFinite(body.range.high)
      ? { low: Math.round(body.range.low), high: Math.round(body.range.high) }
      : null;

  const lead = {
    id,
    embedId: e.id,
    createdAt: new Date().toISOString(),
    status: "new",
    answers,
    range,
    contact: {
      name: contact.name.trim().slice(0, 80),
      phone: String(contact.phone).trim().slice(0, 40),
      address: String(contact.address ?? "").slice(0, 200),
      comment: String(contact.comment ?? "").slice(0, 1000),
    },
    photos: saved,
    source: String(body.source ?? "embed").slice(0, 200),
  };

  const all = readJson(EMBED_LEADS, []);
  all.unshift(lead);
  writeJson(EMBED_LEADS, all);

  res.json({ ok: true, id });
  notifyEmbed(e, lead).catch((err) => console.warn("embed telegram:", err.message));
});

app.get("/api/embeds", auth, (_req, res) => res.json({ embeds: readEmbeds().map(maskEmbed) }));

app.get("/api/embeds/leads", auth, (_req, res) => res.json({ leads: readJson(EMBED_LEADS, []) }));

app.post("/api/embeds", auth, (req, res) => {
  const b = req.body ?? {};
  const id = String(b.id ?? "").trim().toLowerCase() || crypto.randomBytes(4).toString("hex");
  if (!/^[a-z0-9]{4,16}$/.test(id)) return res.status(400).json({ error: "id: 4–16 символов, латиница и цифры" });
  const list = readEmbeds();
  const idx = list.findIndex((x) => x.id === id);
  const prev = idx >= 0 ? list[idx] : null;
  const rec = {
    id,
    name: String(b.name ?? "PDR").slice(0, 40),
    city: String(b.city ?? "").slice(0, 30),
    phone: String(b.phone ?? "").slice(0, 25),
    master: String(b.master ?? "").slice(0, 20),
    chatId: String(b.chatId ?? "").slice(0, 30),
    botToken: String(b.botToken ?? "").trim().slice(0, 90) || prev?.botToken || "",
    accent: /^#[0-9a-f]{6}$/i.test(String(b.accent ?? "")) ? String(b.accent) : prev?.accent || "#FF6A1A",
    createdAt: prev?.createdAt ?? new Date().toISOString(),
  };
  if (idx >= 0) list[idx] = rec;
  else list.unshift(rec);
  writeJson(EMBEDS, list);
  res.json({ ok: true, id, embed: maskEmbed(rec) });
});

app.delete("/api/embeds/:id", auth, (req, res) => {
  const list = readEmbeds().filter((e) => e.id !== String(req.params.id));
  writeJson(EMBEDS, list);
  res.json({ ok: true });
});

/** Достаём chat_id из бота клиента: он пишет /start, мы читаем getUpdates. */
app.post("/api/embeds/probe", auth, async (req, res) => {
  const token = String(req.body?.token ?? "").trim();
  if (!/^\d{6,}:[A-Za-z0-9_-]{20,}$/.test(token)) {
    return res.status(400).json({ error: "Это не похоже на токен бота" });
  }
  const r = await fetch(`${tgBase(token)}/getUpdates?limit=10`);
  const data = await r.json().catch(() => null);
  if (!data?.ok) return res.status(400).json({ error: "Telegram не принял токен", detail: data?.description });
  const msg = [...(data.result ?? [])].reverse().find((u) => u.message?.chat?.id);
  if (!msg) return res.status(404).json({ error: "Напишите боту /start и нажмите ещё раз" });
  const chat = msg.message.chat;
  res.json({ ok: true, chatId: String(chat.id), title: [chat.first_name, chat.username && "@" + chat.username].filter(Boolean).join(" ") });
});

async function notifyEmbed(e, lead) {
  const token = e.botToken || BOT_TOKEN;
  const chatId = e.chatId;
  if (!token || !chatId) return;

  const lines = [
    `🚗 Заявка с сайта · ${e.name}`,
    lead.range ? `Вилка: ${lead.range.low}–${lead.range.high} ₽` : "Вилка: по осмотру",
    `${labelOf("zone", lead.answers.zone)} · ${labelOf("size", lead.answers.size)} · ${labelOf("dent_class", lead.answers.dent_class)}`,
    `${labelOf("count", lead.answers.count)} · ${labelOf("urgency", lead.answers.urgency)} · ${labelOf("travel", lead.answers.travel)}`,
    `Краска: ${labelOf("paint", lead.answers.paint)} · Доступ: ${labelOf("access", lead.answers.access)}`,
    "",
    `👤 ${lead.contact.name} · ${lead.contact.phone}`,
    lead.contact.address ? `📍 ${lead.contact.address}` : "",
    lead.contact.comment ? `💬 ${lead.contact.comment}` : "",
  ].filter(Boolean);

  const first = lead.photos[0];
  if (first) {
    const buf = fs.readFileSync(path.join(PHOTOS, path.basename(first)));
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("caption", lines.join("\n").slice(0, 1024));
    form.append("photo", new Blob([buf], { type: "image/jpeg" }), path.basename(first));
    const r = await fetch(`${tgBase(token)}/sendPhoto`, { method: "POST", body: form });
    if (!r.ok) throw new Error(await r.text());
    return;
  }
  const r = await fetch(`${tgBase(token)}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: lines.join("\n"), disable_web_page_preview: true }),
  });
  if (!r.ok) throw new Error(await r.text());
}

app.post("/api/works", auth, (req, res) => {
  const slot = Number(req.body?.slot);
  const data = String(req.body?.data ?? "");
  if (!Number.isInteger(slot) || slot < 1 || slot > 6) return res.status(400).json({ error: "slot 1..6" });
  const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(data);
  if (!m) return res.status(400).json({ error: "jpeg/png/webp expected" });
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > 6 * 1024 * 1024) return res.status(413).json({ error: "max 6 MB" });
  fs.writeFileSync(path.join(WORKS, `w${slot}.jpg`), buf);
  res.json({ ok: true, works: worksList() });
});

app.delete("/api/works/:slot", auth, (req, res) => {
  const slot = Number(req.params.slot);
  if (!Number.isInteger(slot) || slot < 1 || slot > 6) return res.status(400).json({ error: "slot 1..6" });
  fs.rmSync(path.join(WORKS, `w${slot}.jpg`), { force: true });
  res.json({ ok: true, works: worksList() });
});

app.use("/works", express.static(WORKS, { maxAge: "1d" }));
app.use("/uploads", express.static(PHOTOS, { maxAge: "7d" }));

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** index.html с подставленным брендом: превью ссылки в Telegram/WhatsApp показывает имя мастера */
function renderIndex(req) {
  const settings = readJson(SETTINGS, defaultSettings());
  const b = settings.brand || {};
  const q = req.query;
  const pick = (key, fallback, max) => {
    const v = typeof q[key] === "string" ? q[key].trim() : "";
    return (v || fallback || "").slice(0, max);
  };
  const name = pick("b", b.name, 28).toUpperCase();
  const city = pick("c", b.city, 24);
  const title = `${name} — ремонт вмятин без покраски${city ? ` · ${city}` : ""}`;
  const desc = `Ремонт вмятин без покраски${city ? ` · ${city}` : ""}: заводское покрытие остаётся на месте. Расчёт цены по фото за 60 секунд, выезд по городу.`;
  const ogTitle = `${name}${city ? " · " + city : ""} — ремонт вмятин без покраски`;
  const origin = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
  const ogImage = `${origin.replace(/\/$/, "")}/og.jpg`;

  const html = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
  return html
    .replace(/__TITLE__/g, esc(title))
    .replace(/__OG_TITLE__/g, esc(ogTitle))
    .replace(/__DESC__/g, esc(desc))
    .replace(/__BRAND__/g, esc(name))
    .replace(/__OG_IMAGE__/g, esc(ogImage));
}

if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { index: false }));
  // виджет для чужого сайта — отдельная страница без шапки и подвала
  app.get("/embed/:id", (_req, res) => {
    const file = path.join(DIST, "embed.html");
    if (!fs.existsSync(file)) return res.status(503).send("виджет не собран");
    res.type("html").send(fs.readFileSync(file, "utf8"));
  });
  app.get(/.*/, (req, res) => {
    res.type("html").send(renderIndex(req));
  });
}

async function notifyTelegram(lead) {
  const settings = readJson(SETTINGS, defaultSettings());
  const chatId = settings.telegramChatId || process.env.TELEGRAM_CHAT_ID || "";
  if (!BOT_TOKEN || !chatId) return;

  const lines = [
    `🚗 Новая заявка · ${lead.range ? `${lead.range.low}–${lead.range.high} ₽` : "цена по осмотру"}`,
    `${labelOf("zone", lead.answers.zone)} · ${labelOf("size", lead.answers.size)} · ${labelOf("dent_class", lead.answers.dent_class)}`,
    `${labelOf("count", lead.answers.count)} · ${labelOf("urgency", lead.answers.urgency)} · ${labelOf("travel", lead.answers.travel)}`,
    `Краска: ${labelOf("paint", lead.answers.paint)} · Доступ: ${labelOf("access", lead.answers.access)}`,
    "",
    `👤 ${lead.contact.name} · ${lead.contact.phone}`,
    lead.contact.address ? `📍 ${lead.contact.address}` : "",
    lead.contact.comment ? `💬 ${lead.contact.comment}` : "",
    "",
    `Открыть кабинет: ${process.env.PUBLIC_URL || "http://localhost:" + PORT}/admin`,
  ].filter(Boolean);

  const base = TG_BASE;
  const first = lead.photos[0];

  if (first) {
    const buf = fs.readFileSync(path.join(PHOTOS, path.basename(first)));
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("caption", lines.join("\n").slice(0, 1024));
    form.append("photo", new Blob([buf], { type: "image/jpeg" }), path.basename(first));
    const r = await fetch(`${base}/sendPhoto`, { method: "POST", body: form });
    if (!r.ok) throw new Error(await r.text());
  } else {
    const r = await fetch(`${base}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: lines.join("\n"), disable_web_page_preview: true }),
    });
    if (!r.ok) throw new Error(await r.text());
  }
}

app.listen(PORT, () => {
  console.log(`smeta server → http://localhost:${PORT}`);
  if (ADMIN_PASSWORD === "admin") console.log("⚠ пароль админки по умолчанию: admin (задайте ADMIN_PASSWORD)");
  if (!BOT_TOKEN) console.log("ℹ TELEGRAM_BOT_TOKEN не задан — уведомления в Telegram отключены");
  else if (BOT_POLLING) startBot({ token: BOT_TOKEN, base: TG_BASE, ownerChatId: process.env.TELEGRAM_CHAT_ID || "" });
  else console.log("ℹ BOT_POLLING=0 — команды бота на этом сервере выключены (уведомления работают)");
});
