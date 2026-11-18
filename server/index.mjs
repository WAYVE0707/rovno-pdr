import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import express from "express";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA = path.join(ROOT, "data");
const PHOTOS = path.join(DATA, "photos");
const LEADS = path.join(DATA, "leads.json");
const SETTINGS = path.join(DATA, "settings.json");
const DIST = path.join(ROOT, "dist");
const PORT = Number(process.env.PORT || 8787);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const SECRET = process.env.TOKEN_SECRET || "smeta-local-secret";

fs.mkdirSync(PHOTOS, { recursive: true });

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
  };
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
app.use(express.json({ limit: "30mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

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
  const merged = {
    ...current,
    master: String(next.master ?? current.master).slice(0, 60),
    city: String(next.city ?? current.city).slice(0, 60),
    phone: String(next.phone ?? current.phone).slice(0, 40),
    telegramChatId: String(next.telegramChatId ?? current.telegramChatId).slice(0, 40),
    baseRates: next.baseRates ?? current.baseRates,
  };
  writeJson(SETTINGS, merged);
  res.json({ ok: true });
});

app.use("/uploads", express.static(PHOTOS, { maxAge: "7d" }));

if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(DIST, "index.html")));
}

async function notifyTelegram(lead) {
  const settings = readJson(SETTINGS, defaultSettings());
  const chatId = settings.telegramChatId;
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

  const base = `https://api.telegram.org/bot${BOT_TOKEN}`;
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
});
