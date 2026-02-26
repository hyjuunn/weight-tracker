"use client";

import { useEffect, useMemo, useState } from "react";
import WeightChart from "./WeightChart";

type UserId = "Eric" | "Jun" | "Jaehah";

type LogItem = {
  userId: UserId;
  dateKey: string;
  weightKg?: number | null;
  note?: string | null;
};

type Trend = "up" | "down" | "same" | "none";

function toDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function parseWeight(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;
  const n = Number.parseFloat(trimmed);
  if (!Number.isFinite(n) || n <= 0 || n > 500) return NaN;
  return n;
}

function formatWeight(w?: number | null) {
  if (typeof w !== "number") return "-";
  return (Math.round(w * 100) / 100).toString();
}

const cardClassName =
  "rounded-2xl border border-white/10 bg-black/20 p-4 shadow-lg shadow-black/20 sm:p-5";
const inputClassName =
  "h-12 w-full rounded-xl border border-white/15 bg-black/35 px-4 text-base text-white placeholder:text-slate-400 outline-none transition focus:border-white/40 focus:ring-2 focus:ring-indigo-400/50";

export default function DashboardClient() {
  const [userId, setUserId] = useState<UserId>("Eric");
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [editDate, setEditDate] = useState<string>(() => toDateKey(new Date()));
  const [editWeight, setEditWeight] = useState("");
  const [items, setItems] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingToday, setSavingToday] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const fromKey = useMemo(() => toDateKey(addDays(new Date(), -30)), []);

  useEffect(() => {
    const saved = localStorage.getItem("wt_userId");
    if (saved === "Eric" || saved === "Jun" || saved === "Jaehah") setUserId(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("wt_userId", userId);
  }, [userId]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/logs?userId=${userId}&from=${fromKey}&to=${todayKey}`,
        { cache: "no-store" }
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error ?? `Failed to load (${res.status})`);
      }

      const loaded: LogItem[] = data.items ?? [];
      setItems(loaded);

      const today = loaded.find((x) => x.dateKey === todayKey);
      setWeight(today?.weightKg != null ? String(today.weightKg) : "");
      setNote(today?.note ?? "");
      setEditDate(todayKey);
      setEditWeight(today?.weightKg != null ? String(today.weightKg) : "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function saveLog(payload: {
    userId: UserId;
    dateKey: string;
    weightKg?: number | null;
    note?: string | null;
  }) {
    const res = await fetch("/api/logs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? `Save failed (${res.status})`);
  }

  async function saveToday() {
    const weightKg = parseWeight(weight);
    if (Number.isNaN(weightKg)) {
      alert("Invalid weight. Use a number between 0 and 500.");
      return;
    }

    setSavingToday(true);
    setError(null);

    try {
      await saveLog({
        userId,
        dateKey: todayKey,
        weightKg,
        note: note.trim() === "" ? null : note.trim(),
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingToday(false);
    }
  }

  async function saveEdit() {
    const weightKg = parseWeight(editWeight);
    if (Number.isNaN(weightKg)) {
      alert("Invalid weight. Use a number between 0 and 500.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(editDate)) {
      alert("Invalid date.");
      return;
    }

    setSavingEdit(true);
    setError(null);

    try {
      await saveLog({
        userId,
        dateKey: editDate,
        weightKg,
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingEdit(false);
    }
  }

  useEffect(() => {
    const found = items.find((x) => x.dateKey === editDate);
    setEditWeight(found?.weightKg != null ? String(found.weightKg) : "");
  }, [editDate, items]);

  const weightedItems = useMemo(
    () => items.filter((x) => typeof x.weightKg === "number"),
    [items]
  );

  const trendByDate = useMemo(() => {
    const sorted = weightedItems
      .slice()
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

    const trendMap = new Map<string, Trend>();
    let previousWeight: number | null = null;

    sorted.forEach((item) => {
      const currentWeight = item.weightKg as number;

      if (previousWeight == null) {
        trendMap.set(item.dateKey, "none");
      } else if (currentWeight > previousWeight) {
        trendMap.set(item.dateKey, "up");
      } else if (currentWeight < previousWeight) {
        trendMap.set(item.dateKey, "down");
      } else {
        trendMap.set(item.dateKey, "same");
      }

      previousWeight = currentWeight;
    });

    return trendMap;
  }, [weightedItems]);

  const trendDisplay = {
    up: { icon: "⬆️", className: "text-rose-300" },
    down: { icon: "⬇️", className: "text-emerald-300" },
    same: { icon: "➡️", className: "text-slate-300" },
    none: { icon: "•", className: "text-slate-400" },
  } as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-200">User</label>
          <select
            className="h-11 rounded-xl border border-white/20 bg-black/35 px-3 text-base text-white outline-none focus:border-white/40"
            value={userId}
            onChange={(e) => setUserId(e.target.value as UserId)}
          >
            <option value="Eric">Eric</option>
            <option value="Jun">Jun</option>
            <option value="Jaehah">Jaehah</option>
          </select>
        </div>

        <span className="text-sm text-slate-300">{loading ? "Loading latest entries..." : "Last 30 days overview"}</span>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-400/60 bg-rose-950/40 p-3 text-sm text-rose-100">
          <span className="font-medium">Error:</span> {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={cardClassName}>
          <h2 className="text-lg font-semibold text-white">Today ({todayKey})</h2>
          <p className="mt-1 text-sm text-slate-300">Log your current weight and notes.</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              className={inputClassName}
              inputMode="decimal"
              placeholder="Weight (kg)"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
            <button
              className="h-12 rounded-xl bg-white px-5 text-base font-semibold text-black transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={saveToday}
              disabled={savingToday}
            >
              {savingToday ? "Saving..." : "Save"}
            </button>
          </div>

          <textarea
            className="mt-3 w-full rounded-xl border border-white/15 bg-black/35 px-4 py-3 text-base text-white placeholder:text-slate-400 outline-none transition focus:border-white/40 focus:ring-2 focus:ring-indigo-400/50"
            rows={4}
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </section>

        <section className={cardClassName}>
          <h2 className="text-lg font-semibold text-white">Edit past date</h2>
          <p className="mt-1 text-sm text-slate-300">Pick a date and overwrite the logged weight.</p>

          <div className="mt-4 space-y-3">
            <input
              type="date"
              className={inputClassName}
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              max={todayKey}
            />
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                className={inputClassName}
                inputMode="decimal"
                placeholder="Weight (kg)"
                value={editWeight}
                onChange={(e) => setEditWeight(e.target.value)}
              />
              <button
                className="h-12 rounded-xl border border-white/20 bg-black/25 px-5 text-base font-semibold text-white transition hover:border-white/35 hover:bg-black/35 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={saveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? "Saving..." : "Update"}
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className={cardClassName}>
        <h2 className="mb-3 text-lg font-semibold text-white">Weight chart (last 30 days)</h2>
        <WeightChart items={items} />
      </section>

      <section className={cardClassName}>
        <h2 className="mb-3 text-lg font-semibold text-white">Last 30 days</h2>

        {items.length === 0 ? (
          <p className="text-slate-300">No logs yet.</p>
        ) : (
          <div className="space-y-2">
            {weightedItems
              .slice()
              .reverse()
              .map((x) => (
                <div
                  key={`${x.userId}-${x.dateKey}`}
                  className="grid grid-cols-[1fr_auto] items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                >
                  <div className="font-mono text-sm text-slate-200">{x.dateKey}</div>
                  <div className="text-sm font-medium text-white">{formatWeight(x.weightKg)} kg</div>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
