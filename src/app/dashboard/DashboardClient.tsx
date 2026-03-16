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

type Trend = "up" | "down" | "same" | "none";
type TabKey = "weight" | "gallery";
type GallerySortBy = "date" | "person";
type GallerySortDir = "desc" | "asc";

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
  const [activeTab, setActiveTab] = useState<TabKey>("weight");
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [editDate, setEditDate] = useState<string>(() => toDateKey(new Date()));
  const [editWeight, setEditWeight] = useState("");
  const [items, setItems] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingToday, setSavingToday] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [galleryDate, setGalleryDate] = useState<string>(() => toDateKey(new Date()));
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryItems, setGalleryItems] = useState<FoodPhotoItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [gallerySaving, setGallerySaving] = useState(false);
  const [galleryDeletingId, setGalleryDeletingId] = useState<string | null>(null);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [galleryHasMore, setGalleryHasMore] = useState(false);
  const [galleryLoadingMore, setGalleryLoadingMore] = useState(false);
  const [onlyMyPhotos, setOnlyMyPhotos] = useState(false);
  const [gallerySortBy, setGallerySortBy] = useState<GallerySortBy>("date");
  const [gallerySortDir, setGallerySortDir] = useState<GallerySortDir>("desc");
  const [expandedPhoto, setExpandedPhoto] = useState<FoodPhotoItem | null>(null);

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

  async function loadGallery(reset: boolean) {
    if (reset) {
      setGalleryLoading(true);
      setGalleryItems([]);
    } else {
      setGalleryLoadingMore(true);
    }
    setGalleryError(null);

    try {
      const params = new URLSearchParams();
      params.set("limit", "5");
      if (onlyMyPhotos) params.set("userId", userId);

      if (!reset && galleryItems.length > 0) {
        const lastItem = galleryItems[galleryItems.length - 1];
        params.set("beforeCreatedAt", lastItem.createdAt);
        params.set("beforeId", lastItem.id);
      }

      const res = await fetch(`/api/food-photos?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error ?? `Failed to load gallery (${res.status})`);
      }

      const loaded: FoodPhotoItem[] = data.items ?? [];
      setGalleryItems((prev) => (reset ? loaded : [...prev, ...loaded]));
      setGalleryHasMore(Boolean(data.hasMore));
    } catch (e: unknown) {
      setGalleryError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setGalleryLoading(false);
      setGalleryLoadingMore(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    loadGallery(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, onlyMyPhotos]);

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

  function onGalleryFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setGalleryFiles(files);
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

  async function saveGalleryImages() {
    if (galleryFiles.length === 0) {
      alert("Please choose at least one food image.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(galleryDate)) {
      alert("Invalid date.");
      return;
    }

    setGallerySaving(true);
    setGalleryError(null);

    try {
      const images = await Promise.all(galleryFiles.map((file) => fileToDataUrl(file)));
      const res = await fetch("/api/food-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, dateKey: galleryDate, images }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Upload failed (${res.status})`);

      setGalleryFiles([]);
      await loadGallery(true);
    } catch (e: unknown) {
      setGalleryError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setGallerySaving(false);
    }
  }

  async function deletePhoto(photoId: string) {
    const confirmed = window.confirm("Delete this photo?");
    if (!confirmed) return;

    setGalleryDeletingId(photoId);
    setGalleryError(null);

    try {
      const res = await fetch("/api/food-photos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId, userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `Delete failed (${res.status})`);

      if (expandedPhoto?.id === photoId) {
        setExpandedPhoto(null);
      }

      await loadGallery(true);
    } catch (e: unknown) {
      setGalleryError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setGalleryDeletingId(null);
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

  const sortedGalleryItems = useMemo(() => {
    return galleryItems.slice().sort((a, b) => {
      if (gallerySortBy === "person") {
        const byUser = a.userId.localeCompare(b.userId);
        if (byUser !== 0) return gallerySortDir === "asc" ? byUser : -byUser;

        const byDate = a.dateKey.localeCompare(b.dateKey);
        if (byDate !== 0) return gallerySortDir === "asc" ? byDate : -byDate;

        const byCreatedAt = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return gallerySortDir === "asc" ? byCreatedAt : -byCreatedAt;
      }

      const byDate = a.dateKey.localeCompare(b.dateKey);
      if (byDate !== 0) return gallerySortDir === "asc" ? byDate : -byDate;

      const byCreatedAt = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return gallerySortDir === "asc" ? byCreatedAt : -byCreatedAt;
    });
  }, [galleryItems, gallerySortBy, gallerySortDir]);

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

        <span className="text-sm text-slate-300">
          {activeTab === "weight"
            ? loading
              ? "Loading latest entries..."
              : "Last 30 days overview"
            : galleryLoading
              ? "Loading gallery..."
              : "Recent shared food photos"}
        </span>
      </div>

      <div className="flex gap-2 rounded-xl border border-white/10 bg-black/20 p-1">
        <button
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            activeTab === "weight"
              ? "bg-white text-black"
              : "text-slate-200 hover:bg-white/10"
          }`}
          onClick={() => setActiveTab("weight")}
        >
          Weight
        </button>
        <button
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            activeTab === "gallery"
              ? "bg-white text-black"
              : "text-slate-200 hover:bg-white/10"
          }`}
          onClick={() => setActiveTab("gallery")}
        >
          Gallery
        </button>
      </div>

      {activeTab === "weight" ? (
        <>
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
      ) : (
        <>
          {galleryError ? (
            <div className="rounded-xl border border-rose-400/60 bg-rose-950/40 p-3 text-sm text-rose-100">
              <span className="font-medium">Error:</span> {galleryError}
            </div>
          ) : null}

          <section className={cardClassName}>
            <h2 className="text-lg font-semibold text-white">Upload food photos</h2>
            <p className="mt-1 text-sm text-slate-300">
              Share one or more photos with a selected date. Default date is today.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                type="date"
                className={inputClassName}
                value={galleryDate}
                onChange={(e) => setGalleryDate(e.target.value)}
                max={todayKey}
              />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                multiple
                className="h-12 w-full rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-sm leading-normal text-slate-200 file:mr-3 file:h-8 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-0 file:text-sm file:font-semibold file:leading-8 file:text-black file:align-middle"
                onChange={onGalleryFileChange}
              />
            </div>

            <div className="mt-3 text-sm text-slate-300">
              {galleryFiles.length > 0
                ? `${galleryFiles.length} file(s) selected`
                : "No files selected"}
            </div>

            <button
              className="mt-4 h-12 rounded-xl bg-white px-5 text-base font-semibold text-black transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={saveGalleryImages}
              disabled={gallerySaving}
            >
              {gallerySaving ? "Uploading..." : "Upload photos"}
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
                    checked={onlyMyPhotos}
                    onChange={(e) => setOnlyMyPhotos(e.target.checked)}
                  />
                  Only my photos
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <span>Sort by</span>
                  <select
                    className="h-9 rounded-lg border border-white/20 bg-black/35 px-2 text-sm text-white outline-none focus:border-white/40"
                    value={gallerySortBy}
                    onChange={(e) => setGallerySortBy(e.target.value as GallerySortBy)}
                  >
                    <option value="date">Date</option>
                    <option value="person">Person</option>
                  </select>
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-200">
                  <span>Order</span>
                  <select
                    className="h-9 rounded-lg border border-white/20 bg-black/35 px-2 text-sm text-white outline-none focus:border-white/40"
                    value={gallerySortDir}
                    onChange={(e) => setGallerySortDir(e.target.value as GallerySortDir)}
                  >
                    <option value="desc">Newest / Z→A</option>
                    <option value="asc">Oldest / A→Z</option>
                  </select>
                </label>
              </div>
            </div>

            {galleryItems.length === 0 && !galleryLoading ? (
              <p className="text-slate-300">No food photos yet.</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {sortedGalleryItems.map((photo) => {
                    const isMine = photo.userId === userId;
                    return (
                      <article
                        key={photo.id}
                        className="overflow-hidden rounded-xl border border-white/10 bg-black/30"
                      >
                        <button
                          type="button"
                          className="block w-full cursor-zoom-in"
                          onClick={() => setExpandedPhoto(photo)}
                        >
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
                              onClick={() => deletePhoto(photo.id)}
                              disabled={galleryDeletingId === photo.id}
                            >
                              {galleryDeletingId === photo.id ? "Deleting..." : "Delete"}
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="mt-4 flex justify-center">
                  {galleryHasMore ? (
                    <button
                      type="button"
                      className="h-11 rounded-xl border border-white/25 px-4 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10 disabled:opacity-60"
                      onClick={() => loadGallery(false)}
                      disabled={galleryLoadingMore}
                    >
                      {galleryLoadingMore ? "Loading..." : "Show older photos"}
                    </button>
                  ) : (
                    <p className="text-sm text-slate-400">You reached the oldest photo.</p>
                  )}
                </div>
              </>
            )}
          </section>

          {expandedPhoto ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
              onClick={() => setExpandedPhoto(null)}
            >
              <div
                className="max-h-[95vh] w-full max-w-4xl rounded-2xl border border-white/20 bg-slate-950 p-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between text-sm text-slate-200">
                  <div>
                    <span className="font-semibold text-white">{expandedPhoto.userId}</span> · {expandedPhoto.dateKey}
                  </div>
                  <button
                    type="button"
                    className="rounded-md border border-white/30 px-3 py-1 text-xs text-white hover:bg-white/10"
                    onClick={() => setExpandedPhoto(null)}
                  >
                    Close
                  </button>
                </div>
                <Image
                  src={expandedPhoto.imageDataUrl}
                  alt={`${expandedPhoto.userId} food on ${expandedPhoto.dateKey}`}
                  width={1200}
                  height={900}
                  className="max-h-[80vh] w-full rounded-lg object-contain"
                  unoptimized
                />
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
