import raw from "../../presets/pdr.json";

export type PresetOption = {
  id: string;
  label: string;
  factor?: number;
  hint?: string;
};

export type PresetStep = {
  id: string;
  title: string;
  type: "single";
  options: PresetOption[];
};

export type PresetRule = {
  if: Record<string, string>;
  action: string;
  message: string;
};

export type Preset = {
  id: string;
  version: number;
  brand: { title: string; subtitle: string; disclaimer: string };
  currency: string;
  steps: PresetStep[];
  base_rates: Record<string, Record<string, number | null> | null>;
  modifiers: Record<string, number>;
  range: { low: number; high: number; round_to: number };
  rules: PresetRule[];
  copy: Record<string, string>;
  pricing_plan: { setup: number; hosting_month: number; addon_telegram_domain: number };
};

export const preset = raw as unknown as Preset;

export const brand = {
  name: "РОВНО",
  tagline: "PDR-студия",
  master: "Артём",
  city: "Краснодар",
  phone: "+7 900 000-00-00",
  phoneHref: "tel:+79000000000",
  telegram: "https://t.me/",
  hours: "Ежедневно 9:00–21:00",
  years: 7,
  cars: 4200,
};

export const zones = preset.steps.find((s) => s.id === "zone")!.options;
