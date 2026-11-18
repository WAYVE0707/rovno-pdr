import { preset } from "./preset";

export type Answers = Record<string, string>;

export type CalcResult =
  | { ok: true; low: number; high: number }
  | { ok: false; message: string };

function ruleMessage(answers: Answers): string | null {
  for (const rule of preset.rules) {
    const match = Object.entries(rule.if).every(([k, v]) => answers[k] === v);
    if (match) return rule.message;
  }
  return null;
}

export type Rates = Record<string, Record<string, number | null> | null>;

export function calculate(answers: Answers, ratesTable: Rates = preset.base_rates): CalcResult {
  const blocked = ruleMessage(answers);
  if (blocked) return { ok: false, message: blocked };

  const rates = ratesTable[answers.dent_class];
  if (!rates) return { ok: false, message: "Цену мастер назовёт после осмотра." };

  const base = rates[answers.size];
  if (base === null || base === undefined) {
    return { ok: false, message: "Цену мастер назовёт после осмотра." };
  }

  const zone = preset.steps
    .find((s) => s.id === "zone")!
    .options.find((o) => o.id === answers.zone);

  let value = base * (zone?.factor ?? 1);
  const mods = preset.modifiers;

  if (answers.access === "demount") value += mods.demount ?? 0;
  if (answers.travel === "onsite") value += mods.travel_onsite ?? 0;
  if (answers.urgency === "today") value *= 1 + (mods.urgency_today ?? 0);

  const countMod = mods[`count_${answers.count}`];
  if (countMod) value *= 1 + countMod;

  const { low, high, round_to } = preset.range;
  return {
    ok: true,
    low: Math.floor((value * low) / round_to) * round_to,
    high: Math.ceil((value * high) / round_to) * round_to,
  };
}

export function rub(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n);
}

export function label(stepId: string, optionId: string | undefined): string {
  if (!optionId) return "—";
  const step = preset.steps.find((s) => s.id === stepId);
  return step?.options.find((o) => o.id === optionId)?.label ?? optionId;
}

export function summary(answers: Answers): string[] {
  return preset.steps
    .filter((s) => s.id !== "paint" || answers.paint === "damaged")
    .map((s) => label(s.id, answers[s.id]))
    .filter((v) => v !== "—");
}
