export type LeadPayload = {
  answers: Record<string, string>;
  range: { low: number; high: number } | null;
  contact: { name: string; phone: string; address: string; comment: string };
  photos: string[];
  source?: string;
};

export type Lead = LeadPayload & {
  id: string;
  createdAt: string;
  status: "new" | "work" | "done" | "lost";
};

const TOKEN_KEY = "smeta_token";

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setToken(token: string) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export function submitLead(payload: LeadPayload) {
  return api<{ ok: true; id: string }>("/api/leads", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function login(password: string) {
  return api<{ token: string }>("/api/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function listLeads() {
  return api<{ leads: Lead[] }>("/api/leads");
}

export function setLeadStatus(id: string, status: Lead["status"]) {
  return api<{ ok: true }>(`/api/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export type BrandSettings = {
  name: string;
  tagline: string;
  master: string;
  city: string;
  phone: string;
  telegram: string;
  hours: string;
  years: number;
  cars: number;
};

export type Settings = {
  city: string;
  phone: string;
  master: string;
  telegramChatId: string;
  baseRates: Record<string, Record<string, number | null> | null>;
  brand?: BrandSettings;
};

export function getSettings() {
  return api<{ settings: Settings }>("/api/settings");
}

export function uploadWork(slot: number, data: string) {
  return api<{ ok: true; works: string[] | null }>("/api/works", {
    method: "POST",
    body: JSON.stringify({ slot, data }),
  });
}

export function deleteWork(slot: number) {
  return api<{ ok: true; works: string[] | null }>(`/api/works/${slot}`, { method: "DELETE" });
}

export function saveSettings(settings: Settings) {
  return api<{ ok: true }>("/api/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

/** Сжимает фото на клиенте: максимум 1400px по длинной стороне, JPEG 0.72. */
export function compressImage(file: File, maxSide = 1400, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Не удалось открыть изображение"));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas недоступен"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/* ───────── виджет для чужого сайта ───────── */

export type EmbedRec = {
  id: string;
  name: string;
  city: string;
  phone: string;
  master: string;
  chatId: string;
  botToken: string;
  accent: string;
  createdAt?: string;
};

export function listEmbeds() {
  return api<{ embeds: EmbedRec[] }>("/api/embeds");
}

export function saveEmbed(payload: Partial<EmbedRec>) {
  return api<{ ok: true; id: string }>("/api/embeds", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteEmbed(id: string) {
  return api<{ ok: true }>(`/api/embeds/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function probeBot(token: string) {
  return api<{ ok: true; chatId: string; title: string }>("/api/embeds/probe", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}
