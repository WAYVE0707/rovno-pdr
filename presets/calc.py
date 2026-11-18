"""Эталонный расчёт вилки по пресету ниши.

Не приложение, а спецификация в коде: приложение должно давать те же числа.
Запуск: python presets/calc.py
"""
import json
import math
from pathlib import Path

PRESET = json.loads((Path(__file__).parent / "pdr.json").read_text(encoding="utf-8"))


def _opts(step_id):
    for step in PRESET["steps"]:
        if step["id"] == step_id:
            return {o["id"]: o for o in step["options"]}
    raise KeyError(step_id)


def check_rules(answers):
    """Возвращает текст-заглушку, если цену считать нельзя."""
    for rule in PRESET["rules"]:
        cond = rule["if"]
        if all(answers.get(k) == v for k, v in cond.items()):
            return rule["message"]
    return None


def calc(answers):
    """answers: dict с ключами zone, size, dent_class, paint, access, count, urgency, travel.

    Возвращает (low, high) или строку с причиной, почему вилки нет.
    """
    blocked = check_rules(answers)
    if blocked:
        return blocked

    base = PRESET["base_rates"].get(answers["dent_class"], {}).get(answers["size"])
    if base is None:
        return "Цену мастер назовёт после осмотра."

    zone = _opts("zone")[answers["zone"]]
    value = base * zone["factor"]

    mods = PRESET["modifiers"]
    if answers.get("access") == "demount":
        value += mods["demount"]
    if answers.get("travel") == "onsite":
        value += mods["travel_onsite"]
    if answers.get("urgency") == "today":
        value *= 1 + mods["urgency_today"]
    k = mods.get(f"count_{answers.get('count')}")
    if k:
        value *= 1 + k

    r = PRESET["range"]
    step = r["round_to"]
    low = math.floor(value * r["low"] / step) * step
    high = math.ceil(value * r["high"] / step) * step
    return int(low), int(high)


CASES = [
    # (ответы, ожидаемая вилка или причина)
    (dict(zone="door", size="1_3", dent_class="smooth", paint="ok", access="free", count="1", urgency="later", travel="shop"), (2500, 3500)),
    (dict(zone="hood", size="4_10", dent_class="smooth", paint="ok", access="free", count="1", urgency="later", travel="shop"), (3500, 5000)),
    (dict(zone="roof", size="11_20", dent_class="smooth", paint="ok", access="free", count="1", urgency="later", travel="shop"), (8000, 10500)),
    (dict(zone="door", size="1_3", dent_class="edge", paint="ok", access="free", count="2_3", urgency="later", travel="shop"), (3000, 4500)),
    (dict(zone="fender", size="1_3", dent_class="smooth", paint="ok", access="demount", count="1", urgency="today", travel="onsite"), (5500, 7500)),
    (dict(zone="door", size="1_3", dent_class="smooth", paint="damaged", access="free", count="1", urgency="later", travel="shop"), "no_price"),
    (dict(zone="hood", size="gt20", dent_class="stretched", paint="ok", access="free", count="1", urgency="later", travel="shop"), "no_price"),
    (dict(zone="hood", size="1_3", dent_class="smooth", paint="ok", access="free", count="many", urgency="later", travel="shop"), "no_price"),
]


if __name__ == "__main__":
    failed = 0
    for answers, expected in CASES:
        got = calc(answers)
        ok = got == expected or (expected == "no_price" and isinstance(got, str))
        failed += 0 if ok else 1
        print(("OK  " if ok else "FAIL"), answers["zone"], answers["size"], answers["dent_class"],
              "->", got, "" if ok else f"(ожидалось {expected})")
    print("\nПровалено:", failed, "из", len(CASES))
    raise SystemExit(1 if failed else 0)
