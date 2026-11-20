import { useEffect, useRef, useState } from "react";
import { compressImage, deleteWork, uploadWork } from "../lib/api";

const LABELS = ["До · работа 1", "После · работа 1", "До · работа 2", "После · работа 2", "До · работа 3", "После · работа 3"];

/** Загрузка работ мастера: 3 пары «до/после» прямо из админки, без пересборки сайта. */
export function WorksUploader() {
  const [works, setWorks] = useState<string[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState("");
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d: { works?: string[] | null }) => setWorks(d.works ?? null))
      .catch(() => setWorks(null));
  }, []);

  const pick = (slot: number) => inputs.current[slot]?.click();

  async function onFile(slot: number, file: File | undefined) {
    if (!file) return;
    setErr("");
    setBusy(slot);
    try {
      const data = await compressImage(file, 1600, 0.82);
      const res = await uploadWork(slot + 1, data);
      setWorks(res.works ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось загрузить фото");
    } finally {
      setBusy(null);
    }
  }

  async function remove(slot: number) {
    setBusy(slot);
    try {
      const res = await deleteWork(slot + 1);
      setWorks(res.works ?? null);
    } catch {
      setErr("Не удалось удалить фото");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="works-admin">
        {LABELS.map((lbl, i) => {
          const src = works?.[i];
          return (
            <div className="works-admin__slot" key={lbl}>
              <button
                type="button"
                className={"works-admin__box" + (src ? " is-filled" : "")}
                onClick={() => pick(i)}
                disabled={busy === i}
              >
                {src ? <img src={src} alt={lbl} /> : <span>{busy === i ? "загрузка…" : "+ фото"}</span>}
              </button>
              <div className="works-admin__bar">
                <span>{lbl}</span>
                {src && (
                  <button type="button" className="works-admin__del" onClick={() => remove(i)} disabled={busy === i}>
                    убрать
                  </button>
                )}
              </div>
              <input
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => onFile(i, e.target.files?.[0])}
              />
            </div>
          );
        })}
      </div>
      <p className="note" style={{ marginTop: 10 }}>
        Загрузите 3 пары «до/после» — они сразу встанут в блок «Работы» на сайте. Пока фото нет, показываются
        демонстрационные. Файлы сжимаются до 1600px, работают фото с телефона.
      </p>
      {err && <p className="note" style={{ color: "#ff6a35" }}>{err}</p>}
    </div>
  );
}
