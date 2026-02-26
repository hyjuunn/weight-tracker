"use client";

import { useEffect, useMemo, useState } from "react";
import WeightChart from "./WeightChart";

type UserId = "A" | "B" | "C";

type LogItem = {
  userId: UserId;
  dateKey: string; // YYYY-MM-DD
  weightKg?: number | null;
  note?: string | null;
};

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
  // 소수 둘째자리까지(너무 길면 보기 별로라)
  return (Math.round(w * 100) / 100).toString();
}

export default function DashboardClient() {
  const [userId, setUserId] = useState<UserId>("A");

  // today entry
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");

  // edit past
  const [editDate, setEditDate] = useState<string>(() => toDateKey(new Date()));
  const [editWeight, setEditWeight] = useState("");

  const [items, setItems] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingToday, setSavingToday] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const fromKey = useMemo(() => toDateKey(addDays(new Date(), -30)), []);

  // 유저 선택 기억(로컬)
  useEffect(() => {
    const saved = localStorage.getItem("wt_userId");
    if (saved === "A" || saved === "B" || saved === "C") setUserId(saved);
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

      // 오늘 값 있으면 입력칸에 채워주기
      const today = loaded.find((x) => x.dateKey === todayKey);
      setWeight(today?.weightKg != null ? String(today.weightKg) : "");
      setNote(today?.note ?? "");

      // 과거 수정 기본값도 오늘로 맞추고, 해당 날짜 값 있으면 세팅
      setEditDate(todayKey);
      setEditWeight(today?.weightKg != null ? String(today.weightKg) : "");
    } catch (e: any) {
      setError(e?.message ?? "Unknown error");
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
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
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
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
    } finally {
      setSavingEdit(false);
    }
  }

  // editDate 바뀌면 해당 날짜 값으로 editWeight 자동 채우기(편의)
  useEffect(() => {
    const found = items.find((x) => x.dateKey === editDate);
    setEditWeight(found?.weightKg != null ? String(found.weightKg) : "");
  }, [editDate, items]);

  return (
    <div className="space-y-6">
      {/* header controls */}
      <div className="flex items-center gap-3">
        <label className="font-medium">User</label>
        <select
          className="border rounded px-2 py-1"
          value={userId}
          onChange={(e) => setUserId(e.target.value as UserId)}
        >
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
        </select>

        <span className="text-sm text-gray-500">
          {loading ? "Loading..." : ""}
        </span>
      </div>

      {error ? (
        <div className="border rounded p-3 text-sm">
          <span className="font-medium">Error:</span> {error}
        </div>
      ) : null}

      {/* today */}
      <div className="border rounded p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Today ({todayKey})</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            className="border rounded px-3 py-2 w-40"
            inputMode="decimal"
            placeholder="Weight (kg)"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <button
            className="border rounded px-3 py-2 disabled:opacity-50"
            onClick={saveToday}
            disabled={savingToday}
          >
            {savingToday ? "Saving..." : "Save"}
          </button>
        </div>

        <textarea
          className="border rounded px-3 py-2 w-full"
          rows={3}
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {/* edit past */}
      <div className="border rounded p-4 space-y-3">
        <h2 className="font-semibold">Edit past date</h2>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            max={todayKey}
          />
          <input
            className="border rounded px-3 py-2 w-40"
            inputMode="decimal"
            placeholder="Weight (kg)"
            value={editWeight}
            onChange={(e) => setEditWeight(e.target.value)}
          />
          <button
            className="border rounded px-3 py-2 disabled:opacity-50"
            onClick={saveEdit}
            disabled={savingEdit}
          >
            {savingEdit ? "Saving..." : "Save"}
          </button>
        </div>

        <p className="text-sm text-gray-500">
          Pick a date and overwrite the weight for that day.
        </p>
      </div>

      {/* chart */}
      <div className="border rounded p-4">
        <h2 className="font-semibold mb-3">Weight chart (last 30 days)</h2>
        <WeightChart items={items} />
      </div>

      {/* list */}
      <div className="border rounded p-4">
        <h2 className="font-semibold mb-3">Last 30 days</h2>

        {items.length === 0 ? (
          <p className="text-gray-500">No logs yet.</p>
        ) : (
          <div className="space-y-2">
            {items
              .slice()
              .reverse()
              .map((x) => (
                <div
                  key={`${x.userId}-${x.dateKey}`}
                  className="flex justify-between border-b pb-1"
                >
                  <div className="font-mono">{x.dateKey}</div>
                  <div>{formatWeight(x.weightKg)}</div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}