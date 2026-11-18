import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { brand as defaultBrand, preset } from "./preset";
import type { Rates } from "./calc";

export type Brand = typeof defaultBrand;

export type PublicConfig = {
  brand: Brand;
  rates: Rates;
};

const FALLBACK: PublicConfig = { brand: defaultBrand, rates: preset.base_rates };

const Ctx = createContext<PublicConfig>(FALLBACK);

/** Демо-ссылка для переписки: ?b=Название&c=Город&p=Телефон&m=Имя мастера
 *  Подменяет бренд на лету — мастер видит сайт уже со своим названием. */
function demoOverrides(): Partial<Brand> {
  if (typeof window === "undefined") return {};
  const q = new URLSearchParams(window.location.search);
  const KEY = "demo_brand";

  // параметры из ссылки запоминаем, чтобы они не терялись при переходах по сайту
  if (q.has("b") || q.has("c") || q.has("p") || q.has("m")) {
    const saved = { b: q.get("b") || "", c: q.get("c") || "", p: q.get("p") || "", m: q.get("m") || "" };
    try {
      sessionStorage.setItem(KEY, JSON.stringify(saved));
    } catch {
      /* приватный режим — не страшно */
    }
  }

  let src: { b?: string; c?: string; p?: string; m?: string } = {
    b: q.get("b") || "",
    c: q.get("c") || "",
    p: q.get("p") || "",
    m: q.get("m") || "",
  };
  if (!src.b && !src.c && !src.p && !src.m) {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) src = JSON.parse(raw);
    } catch {
      /* игнорируем */
    }
  }

  const out: Partial<Brand> = {};
  if (src.b) out.name = src.b.slice(0, 28).toUpperCase();
  if (src.c) out.city = src.c.slice(0, 24);
  if (src.m) out.master = src.m.slice(0, 20);
  if (src.p) {
    out.phone = src.p.slice(0, 20);
    out.phoneHref = "tel:" + src.p.replace(/[^\d+]/g, "");
  }
  return out;
}

/** Загружает название, контакты и прайс с сервера: клиент меняет их в админке без пересборки. */
export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PublicConfig>(FALLBACK);

  useEffect(() => {
    let alive = true;
    fetch("/api/config")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { brand?: Partial<Brand>; rates?: Rates }) => {
        if (!alive || !data) return;
        const brand: Brand = { ...defaultBrand, ...(data.brand ?? {}), ...demoOverrides() };
        if (!brand.phoneHref && brand.phone) {
          brand.phoneHref = "tel:" + brand.phone.replace(/[^\d+]/g, "");
        }
        setConfig({ brand, rates: data.rates ?? preset.base_rates });
        document.title = `${brand.name} — удаление вмятин без покраски`;
      })
      .catch(() => {
        /* офлайн или сервер без API — остаёмся на дефолтах */
      });
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo(() => config, [config]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConfig(): PublicConfig {
  return useContext(Ctx);
}

export function useBrand(): Brand {
  return useContext(Ctx).brand;
}
