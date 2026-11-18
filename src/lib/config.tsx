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

/** Загружает название, контакты и прайс с сервера: клиент меняет их в админке без пересборки. */
export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<PublicConfig>(FALLBACK);

  useEffect(() => {
    let alive = true;
    fetch("/api/config")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { brand?: Partial<Brand>; rates?: Rates }) => {
        if (!alive || !data) return;
        const brand: Brand = { ...defaultBrand, ...(data.brand ?? {}) };
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
