"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import WeightChart from "./WeightChart";

type UserId = "Eric" | "Jun" | "Jaehah";

type LogItem = {
  userId: UserId;
  dateKey: string;
  weightKg?: number | null;
  note?: string | null;
};

type FoodPhotoItem = {
  id: string;
  userId: UserId;
  dateKey: string;
  imageDataUrl: string;
  createdAt: string;
};

type BodyPhotoItem = {
  id: string;
  userId: UserId;
  dateKey: string;
  imageDataUrl: string;
  createdAt: string;
};

type Trend = "up" | "down" | "same" | "none";
type TabKey = "weight" | "foodGallery" | "progression";
type GallerySortBy = "date" | "person";
type GallerySortDir = "desc" | "asc";
type ProgressSortDir = "desc" | "asc";

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
const fileInputClassName =
  "h-12 w-full rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-sm leading-normal text-slate-200 file:mr-3 file:h-8 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-0 file:text-sm file:font-semibold file:leading-8 file:text-black file:align-middle";

export default function DashboardClient() {
  const [userId, setUserId] = useState<UserId>("Eric");
  const [activeTab, setActiveTab] = useState<TabKey>("weight");
  const [entryDate, setEntryDate] = useState<string>(() => toDateKey(new Date()));
  const [entryWeight, setEntryWeight] = useState("");
  const [entryNote, setEntryNote] = useState("");
  const [entryBodyFiles, setEntryBodyFiles] = useState<File[]>([]);
  const [items, setItems] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [foodDate, setFoodDate] = useState<string>(() => toDateKey(new Date()));
  const [foodFiles, setFoodFiles] = useState<File[]>([]);
  const [foodItems, setFoodItems] = useState<FoodPhotoItem[]>([]);
  const [foodLoading, setFoodLoading] = useState(false);
  const [foodSaving, setFoodSaving] = useState(false);
  const [foodDeletingId, setFoodDeletingId] = useState<string | null>(null);
  const [foodError, setFoodError] = useState<string | null>(null);
  const [foodHasMore, setFoodHasMore] = useState(false);
  const [foodLoadingMore, setFoodLoadingMore] = useState(false);
  const [onlyMyFoodPhotos, setOnlyMyFoodPhotos] = useState(false);
  const [foodSortBy, setFoodSortBy] = useState<GallerySortBy>("date");
  const [foodSortDir, setFoodSortDir] = useState<GallerySortDir>("desc");
  const [expandedFoodPhoto, setExpandedFoodPhoto] = useState<FoodPhotoItem | null>(null);

  const [progressDate, setProgressDate] = useState<string>(() => toDateKey(new Date()));
  const [progressFiles, setProgressFiles] = useState<File[]>([]);
  const [progressItems, setProgressItems] = useState<BodyPhotoItem[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressSaving, setProgressSaving] = useState(false);
  const [progressDeletingId, setProgressDeletingId] = useState<string | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [progressHasMore, setProgressHasMore] = useState(false);
  const [progressLoadingMore, setProgressLoadingMore] = useState(false);
  const [progressSortDir, setProgressSortDir] = useState<ProgressSortDir>("desc");
  const [expandedProgressIndex, setExpandedProgressIndex] = useState<number | null>(null);

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
      const res = await fetch(`/api/logs?userId=${userId}&from=${fromKey}&to=${todayKey}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error ?? `Failed to load (${res.status})`);

      const loaded: LogItem[] = data.items ?? [];
      setItems(loaded);

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function loadFoodGallery(reset: boolean) {
    if (reset) {
      setFoodLoading(true);
      setFoodItems([]);
    } else {
      setFoodLoadingMore(true);
    }
    setFoodError(null);

    try {
      const params = new URLSearchParams();
      params.set("limit", "5");
      if (onlyMyFoodPhotos) params.set("userId", userId);

      if (!reset && foodItems.length > 0) {
        const lastItem = foodItems[foodItems.length - 1];
        params.set("beforeCreatedAt", lastItem.createdAt);
        params.set("beforeId", lastItem.id);
      }

      const res = await fetch(`/api/food-photos?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Failed to load food gallery (${res.status})`);

      const loaded: FoodPhotoItem[] = data.items ?? [];
      setFoodItems((prev) => (reset ? loaded : [...prev, ...loaded]));
      setFoodHasMore(Boolean(data.hasMore));
    } catch (e: unknown) {
      setFoodError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setFoodLoading(false);
      setFoodLoadingMore(false);
    }
  }

  async function loadProgressGallery(reset: boolean) {
    if (reset) {
      setProgressLoading(true);
      setProgressItems([]);
    } else {
      setProgressLoadingMore(true);
    }
    setProgressError(null);

    try {
      const params = new URLSearchParams();
      params.set("limit", "8");
      params.set("userId", userId);

      if (!reset && progressItems.length > 0) {
        const lastItem = progressItems[progressItems.length - 1];
        params.set("beforeCreatedAt", lastItem.createdAt);
        params.set("beforeId", lastItem.id);
      }

      const res = await fetch(`/api/body-photos?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Failed to load progression gallery (${res.status})`);

      const loaded: BodyPhotoItem[] = data.items ?? [];
      setProgressItems((prev) => (reset ? loaded : [...prev, ...loaded]));
      setProgressHasMore(Boolean(data.hasMore));
    } catch (e: unknown) {
      setProgressError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setProgressLoading(false);
      setProgressLoadingMore(false);
    }
  }

  useEffect(() => {
    setEntryDate(todayKey);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, todayKey]);

  useEffect(() => {
    loadFoodGallery(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, onlyMyFoodPhotos]);

  useEffect(() => {
    loadProgressGallery(true);
    setExpandedProgressIndex(null);
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

  async function saveWeightAndBodyEntry() {
    const weightKg = parseWeight(entryWeight);
    if (Number.isNaN(weightKg)) {
      alert("Invalid weight. Use a number between 0 and 500.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
      alert("Invalid date.");
      return;
    }

    setSavingEntry(true);
    setError(null);

    try {
      await saveLog({
        userId,
        dateKey: entryDate,
        weightKg,
        note: entryNote.trim() === "" ? null : entryNote.trim(),
      });

      if (entryBodyFiles.length > 0) {
        await saveBodyImages(entryBodyFiles, entryDate, () => setEntryBodyFiles([]));
      }

      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingEntry(false);
    }
  }

  function onFoodFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFoodFiles(Array.from(e.target.files ?? []));
  }

  function onProgressFileChange(e: ChangeEvent<HTMLInputElement>) {
    setProgressFiles(Array.from(e.target.files ?? []));
  }

  function onEntryBodyFileChange(e: ChangeEvent<HTMLInputElement>) {
    setEntryBodyFiles(Array.from(e.target.files ?? []));
  }

  async function fileToDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Failed to read image"));
      };
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });
  }

  async function saveFoodImages() {
    if (foodFiles.length === 0) {
      alert("Please choose at least one food image.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(foodDate)) {
      alert("Invalid date.");
      return;
    }

    setFoodSaving(true);
    setFoodError(null);

    try {
      const images = await Promise.all(foodFiles.map((file) => fileToDataUrl(file)));
      const res = await fetch("/api/food-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, dateKey: foodDate, images }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Upload failed (${res.status})`);

      setFoodFiles([]);
      await loadFoodGallery(true);
    } catch (e: unknown) {
      setFoodError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setFoodSaving(false);
    }
  }

  async function saveBodyImages(files: File[], dateKey: string, clearFiles: () => void) {
    if (files.length === 0) {
      alert("Please choose at least one body photo.");
      return false;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      alert("Invalid date.");
      return false;
    }

    setProgressError(null);

    try {
      const images = await Promise.all(files.map((file) => fileToDataUrl(file)));
      const res = await fetch("/api/body-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, dateKey, images }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Upload failed (${res.status})`);

      clearFiles();
      await loadProgressGallery(true);
      return true;
    } catch (e: unknown) {
      setProgressError(e instanceof Error ? e.message : "Upload failed");
      return false;
    }
  }

  async function saveProgressImages() {
    setProgressSaving(true);
    await saveBodyImages(progressFiles, progressDate, () => setProgressFiles([]));
    setProgressSaving(false);
  }

  async function deleteFoodPhoto(photoId: string) {
    const confirmed = window.confirm("Delete this photo?");
    if (!confirmed) return;

    setFoodDeletingId(photoId);
    setFoodError(null);

    try {
      const res = await fetch("/api/food-photos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId, userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Delete failed (${res.status})`);

      if (expandedFoodPhoto?.id === photoId) setExpandedFoodPhoto(null);
      await loadFoodGallery(true);
    } catch (e: unknown) {
      setFoodError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setFoodDeletingId(null);
    }
  }

  async function deleteBodyPhoto(photoId: string) {
    const confirmed = window.confirm("Delete this photo?");
    if (!confirmed) return;

    setProgressDeletingId(photoId);
    setProgressError(null);

    try {
      const res = await fetch("/api/body-photos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId, userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Delete failed (${res.status})`);

      setExpandedProgressIndex(null);
      await loadProgressGallery(true);
    } catch (e: unknown) {
      setProgressError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setProgressDeletingId(null);
    }
  }

  useEffect(() => {
    const found = items.find((x) => x.dateKey === entryDate);
    setEntryWeight(found?.weightKg != null ? String(found.weightKg) : "");
    setEntryNote(found?.note ?? "");
  }, [entryDate, items]);

  const weightedItems = useMemo(() => items.filter((x) => typeof x.weightKg === "number"), [items]);

  const sortedFoodItems = useMemo(() => {
    return foodItems.slice().sort((a, b) => {
      if (foodSortBy === "person") {
        const byUser = a.userId.localeCompare(b.userId);
        if (byUser !== 0) return foodSortDir === "asc" ? byUser : -byUser;
      }

      const byDate = a.dateKey.localeCompare(b.dateKey);
      if (byDate !== 0) return foodSortDir === "asc" ? byDate : -byDate;

      const byCreatedAt = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return foodSortDir === "asc" ? byCreatedAt : -byCreatedAt;
    });
  }, [foodItems, foodSortBy, foodSortDir]);

  const sortedProgressItems = useMemo(() => {
    return progressItems.slice().sort((a, b) => {
      const byDate = a.dateKey.localeCompare(b.dateKey);
      if (byDate !== 0) return progressSortDir === "asc" ? byDate : -byDate;

      const byCreatedAt = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return progressSortDir === "asc" ? byCreatedAt : -byCreatedAt;
    });
  }, [progressItems, progressSortDir]);

  const expandedProgressPhoto =
    expandedProgressIndex != null && sortedProgressItems.length > 0
      ? sortedProgressItems[expandedProgressIndex]
      : null;

  const trendByDate = useMemo(() => {
    const sorted = weightedItems.slice().sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    const trendMap = new Map<string, Trend>();
    let previousWeight: number | null = null;

    sorted.forEach((item) => {
      const currentWeight = item.weightKg as number;
      if (previousWeight == null) trendMap.set(item.dateKey, "none");
      else if (currentWeight > previousWeight) trendMap.set(item.dateKey, "up");
      else if (currentWeight < previousWeight) trendMap.set(item.dateKey, "down");
      else trendMap.set(item.dateKey, "same");
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

        <span className="text-sm text-slate-300">
          {activeTab === "weight"
            ? loading
              ? "Loading latest entries..."
              : "Last 30 days overview"
            : activeTab === "foodGallery"
              ? foodLoading
                ? "Loading food gallery..."
                : "Recent shared food photos"
              : progressLoading
                ? "Loading progression photos..."
                : `Body progression for ${userId}`}
        </span>
      </div>

      <div className="flex gap-2 rounded-xl border border-white/10 bg-black/20 p-1">
        <button
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            activeTab === "weight" ? "bg-white text-black" : "text-slate-200 hover:bg-white/10"
          }`}
          onClick={() => setActiveTab("weight")}
        >
          Weight
        </button>
        <button
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            activeTab === "foodGallery" ? "bg-white text-black" : "text-slate-200 hover:bg-white/10"
          }`}
          onClick={() => setActiveTab("foodGallery")}
        >
          Food Gallery
        </button>
        <button
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            activeTab === "progression" ? "bg-white text-black" : "text-slate-200 hover:bg-white/10"
          }`}
          onClick={() => setActiveTab("progression")}
        >
          Progression
        </button>
      </div>

      {activeTab === "weight" ? (
        <>
          {error ? (
            <div className="rounded-xl border border-rose-400/60 bg-rose-950/40 p-3 text-sm text-rose-100">
              <span className="font-medium">Error:</span> {error}
            </div>
          ) : null}
          {progressError ? (
            <div className="rounded-xl border border-amber-300/60 bg-amber-950/40 p-3 text-sm text-amber-100">
              <span className="font-medium">Body photo upload:</span> {progressError}
            </div>
          ) : null}

          <section className={cardClassName}>
            <h2 className="text-lg font-semibold text-white">Weight & body photo entry</h2>
            <p className="mt-1 text-sm text-slate-300">
              Use today by default, or choose any past date to update your weight and progression photo together.
            </p>

            <div className="mt-4 space-y-3">
              <input
                type="date"
                className={inputClassName}
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                max={todayKey}
              />
              <input
                className={inputClassName}
                inputMode="decimal"
                placeholder="Weight (kg)"
                value={entryWeight}
                onChange={(e) => setEntryWeight(e.target.value)}
              />
              <textarea
                className="w-full rounded-xl border border-white/15 bg-black/35 px-4 py-3 text-base text-white placeholder:text-slate-400 outline-none transition focus:border-white/40 focus:ring-2 focus:ring-indigo-400/50"
                rows={3}
                placeholder="Note (optional)"
                value={entryNote}
                onChange={(e) => setEntryNote(e.target.value)}
              />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                multiple
                className={fileInputClassName}
                onChange={onEntryBodyFileChange}
              />
              <div className="text-sm text-slate-300">
                {entryBodyFiles.length > 0 ? `${entryBodyFiles.length} body photo(s) selected` : "No body photos selected"}
              </div>
              <button
                className="h-12 rounded-xl bg-white px-5 text-base font-semibold text-black transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={saveWeightAndBodyEntry}
                disabled={savingEntry}
              >
                {savingEntry ? "Saving..." : "Save entry"}
              </button>
            </div>
          </section>

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
                  .map((x) => {
                    const trend = trendByDate.get(x.dateKey) ?? "none";
                    return (
                      <div
                        key={`${x.userId}-${x.dateKey}`}
                        className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                      >
                        <div className="font-mono text-sm text-slate-200">{x.dateKey}</div>
                        <div className={`text-sm ${trendDisplay[trend].className}`}>{trendDisplay[trend].icon}</div>
                        <div className="text-sm font-medium text-white">{formatWeight(x.weightKg)} kg</div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
        </>
      ) : activeTab === "foodGallery" ? (
        <>
          {foodError ? (
            <div className="rounded-xl border border-rose-400/60 bg-rose-950/40 p-3 text-sm text-rose-100">
              <span className="font-medium">Error:</span> {foodError}
            </div>
          ) : null}

          <section className={cardClassName}>
            <h2 className="text-lg font-semibold text-white">Upload food photos</h2>
            <p className="mt-1 text-sm text-slate-300">Share one or more photos with a selected date. Default date is today.</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                type="date"
                className={inputClassName}
                value={foodDate}
                onChange={(e) => setFoodDate(e.target.value)}
                max={todayKey}
              />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                multiple
                className={fileInputClassName}
                onChange={onFoodFileChange}
              />
            </div>

            <div className="mt-3 text-sm text-slate-300">
              {foodFiles.length > 0 ? `${foodFiles.length} file(s) selected` : "No files selected"}
            </div>

            <button
              className="mt-4 h-12 rounded-xl bg-white px-5 text-base font-semibold text-black transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={saveFoodImages}
              disabled={foodSaving}
            >
              {foodSaving ? "Uploading..." : "Upload photos"}
            </button>
          </section>

          <section className={cardClassName}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Food gallery</h2>

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-indigo-400"
                    checked={onlyMyFoodPhotos}
                    onChange={(e) => setOnlyMyFoodPhotos(e.target.checked)}
                  />
                  Only my photos
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <span>Sort by</span>
                  <select
                    className="h-9 rounded-lg border border-white/20 bg-black/35 px-2 text-sm text-white outline-none focus:border-white/40"
                    value={foodSortBy}
                    onChange={(e) => setFoodSortBy(e.target.value as GallerySortBy)}
                  >
                    <option value="date">Date</option>
                    <option value="person">Person</option>
                  </select>
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <span>Order</span>
                  <select
                    className="h-9 rounded-lg border border-white/20 bg-black/35 px-2 text-sm text-white outline-none focus:border-white/40"
                    value={foodSortDir}
                    onChange={(e) => setFoodSortDir(e.target.value as GallerySortDir)}
                  >
                    <option value="desc">Newest / Z→A</option>
                    <option value="asc">Oldest / A→Z</option>
                  </select>
                </label>
              </div>
            </div>

            {foodItems.length === 0 && !foodLoading ? (
              <p className="text-slate-300">No food photos yet.</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sortedFoodItems.map((photo) => {
                    const isMine = photo.userId === userId;
                    return (
                      <article key={photo.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                        <button type="button" className="block w-full cursor-zoom-in" onClick={() => setExpandedFoodPhoto(photo)}>
                          <Image
                            src={photo.imageDataUrl}
                            alt={`${photo.userId} food on ${photo.dateKey}`}
                            width={640}
                            height={480}
                            className="h-48 w-full object-cover"
                            unoptimized
                          />
                        </button>
                        <div className="space-y-2 px-3 py-2 text-sm text-slate-200">
                          <div className="font-medium text-white">{photo.userId}</div>
                          <div className="font-mono">{photo.dateKey}</div>
                          {isMine ? (
                            <button
                              type="button"
                              className="rounded-md border border-rose-400/70 px-3 py-1 text-xs text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-60"
                              onClick={() => deleteFoodPhoto(photo.id)}
                              disabled={foodDeletingId === photo.id}
                            >
                              {foodDeletingId === photo.id ? "Deleting..." : "Delete"}
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="mt-4 flex justify-center">
                  {foodHasMore ? (
                    <button
                      type="button"
                      className="h-11 rounded-xl border border-white/25 px-4 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10 disabled:opacity-60"
                      onClick={() => loadFoodGallery(false)}
                      disabled={foodLoadingMore}
                    >
                      {foodLoadingMore ? "Loading..." : "Show older photos"}
                    </button>
                  ) : (
                    <p className="text-sm text-slate-400">You reached the oldest photo.</p>
                  )}
                </div>
              </>
            )}
          </section>

          {expandedFoodPhoto ? (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80" onClick={() => setExpandedFoodPhoto(null)}>
              <div className="flex min-h-full items-center justify-center p-4">
                <div
                  className="w-full max-w-4xl rounded-2xl border border-white/20 bg-slate-950 p-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mb-3 flex items-center justify-between text-sm text-slate-200">
                    <div>
                      <span className="font-semibold text-white">{expandedFoodPhoto.userId}</span> · {expandedFoodPhoto.dateKey}
                    </div>
                    <button
                      type="button"
                      className="rounded-md border border-white/30 px-3 py-1 text-xs text-white hover:bg-white/10"
                      onClick={() => setExpandedFoodPhoto(null)}
                    >
                      Close
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <Image
                      src={expandedFoodPhoto.imageDataUrl}
                      alt={`${expandedFoodPhoto.userId} food on ${expandedFoodPhoto.dateKey}`}
                      width={1200}
                      height={900}
                      className="max-h-[calc(100vh-9rem)] w-auto max-w-full rounded-lg object-contain"
                      unoptimized
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          {progressError ? (
            <div className="rounded-xl border border-rose-400/60 bg-rose-950/40 p-3 text-sm text-rose-100">
              <span className="font-medium">Error:</span> {progressError}
            </div>
          ) : null}

          <section className={cardClassName}>
            <h2 className="text-lg font-semibold text-white">Upload body progression photos</h2>
            <p className="mt-1 text-sm text-slate-300">Upload your own body photos and review change over time.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                type="date"
                className={inputClassName}
                value={progressDate}
                onChange={(e) => setProgressDate(e.target.value)}
                max={todayKey}
              />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                multiple
                className={fileInputClassName}
                onChange={onProgressFileChange}
              />
            </div>
            <div className="mt-3 text-sm text-slate-300">
              {progressFiles.length > 0 ? `${progressFiles.length} file(s) selected` : "No files selected"}
            </div>
            <button
              className="mt-4 h-12 rounded-xl bg-white px-5 text-base font-semibold text-black transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={saveProgressImages}
              disabled={progressSaving}
            >
              {progressSaving ? "Uploading..." : "Upload photos"}
            </button>
          </section>

          <section className={cardClassName}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Progression gallery</h2>
              <label className="flex items-center gap-2 text-sm text-slate-200">
                <span>Order</span>
                <select
                  className="h-9 rounded-lg border border-white/20 bg-black/35 px-2 text-sm text-white outline-none focus:border-white/40"
                  value={progressSortDir}
                  onChange={(e) => setProgressSortDir(e.target.value as ProgressSortDir)}
                >
                  <option value="desc">Newest first</option>
                  <option value="asc">Oldest first</option>
                </select>
              </label>
            </div>

            {progressItems.length === 0 && !progressLoading ? (
              <p className="text-slate-300">No body progression photos yet.</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sortedProgressItems.map((photo, index) => (
                    <article key={photo.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
                      <button type="button" className="block w-full cursor-zoom-in" onClick={() => setExpandedProgressIndex(index)}>
                        <Image
                          src={photo.imageDataUrl}
                          alt={`${photo.userId} progression on ${photo.dateKey}`}
                          width={640}
                          height={480}
                          className="h-56 w-full object-cover"
                          unoptimized
                        />
                      </button>
                      <div className="space-y-2 px-3 py-2 text-sm text-slate-200">
                        <div className="font-mono">{photo.dateKey}</div>
                        <button
                          type="button"
                          className="rounded-md border border-rose-400/70 px-3 py-1 text-xs text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-60"
                          onClick={() => deleteBodyPhoto(photo.id)}
                          disabled={progressDeletingId === photo.id}
                        >
                          {progressDeletingId === photo.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-4 flex justify-center">
                  {progressHasMore ? (
                    <button
                      type="button"
                      className="h-11 rounded-xl border border-white/25 px-4 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10 disabled:opacity-60"
                      onClick={() => loadProgressGallery(false)}
                      disabled={progressLoadingMore}
                    >
                      {progressLoadingMore ? "Loading..." : "Show older photos"}
                    </button>
                  ) : (
                    <p className="text-sm text-slate-400">You reached the oldest photo.</p>
                  )}
                </div>
              </>
            )}
          </section>

          {expandedProgressPhoto ? (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85" onClick={() => setExpandedProgressIndex(null)}>
              <div className="flex min-h-full items-center justify-center p-4">
                <div className="w-full max-w-5xl rounded-2xl border border-white/20 bg-slate-950 p-3" onClick={(e) => e.stopPropagation()}>
                  <div className="mb-3 flex items-center justify-between text-sm text-slate-200">
                    <div className="font-mono">{expandedProgressPhoto.dateKey}</div>
                    <button
                      type="button"
                      className="rounded-md border border-white/30 px-3 py-1 text-xs text-white hover:bg-white/10"
                      onClick={() => setExpandedProgressIndex(null)}
                    >
                      Close
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="h-10 w-10 shrink-0 rounded-full border border-white/30 text-lg text-white hover:bg-white/10"
                      onClick={() => {
                        if (sortedProgressItems.length === 0 || expandedProgressIndex == null) return;
                        setExpandedProgressIndex(
                          (expandedProgressIndex - 1 + sortedProgressItems.length) % sortedProgressItems.length
                        );
                      }}
                    >
                      ‹
                    </button>
                    <div className="flex min-w-0 flex-1 justify-center">
                      <Image
                        src={expandedProgressPhoto.imageDataUrl}
                        alt={`${expandedProgressPhoto.userId} progression on ${expandedProgressPhoto.dateKey}`}
                        width={1400}
                        height={1000}
                        className="max-h-[calc(100vh-9rem)] w-auto max-w-full rounded-lg object-contain"
                        unoptimized
                      />
                    </div>
                    <button
                      type="button"
                      className="h-10 w-10 shrink-0 rounded-full border border-white/30 text-lg text-white hover:bg-white/10"
                      onClick={() => {
                        if (sortedProgressItems.length === 0 || expandedProgressIndex == null) return;
                        setExpandedProgressIndex((expandedProgressIndex + 1) % sortedProgressItems.length);
                      }}
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
