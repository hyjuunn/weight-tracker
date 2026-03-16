import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { ensureIndexes, getDb } from "@/lib/mongo";

const ALLOWED_USERS = ["Eric", "Jun", "Jaehah"] as const;
type UserId = (typeof ALLOWED_USERS)[number];

function isAllowedUser(u: string): u is UserId {
  return (ALLOWED_USERS as readonly string[]).includes(u);
}

function isValidDateKey(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

async function requireSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  return !!session;
}

function isValidDataUrl(value: string) {
  return /^data:image\/(jpeg|jpg|png|webp|heic|heif);base64,[a-zA-Z0-9+/=]+$/.test(value);
}

function estimateDataUrlSizeBytes(dataUrl: string) {
  const base64Part = dataUrl.split(",")[1] ?? "";
  return Math.floor((base64Part.length * 3) / 4);
}

export async function GET(req: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limitRaw = searchParams.get("limit") ?? "5";
  const userIdParam = searchParams.get("userId") ?? "";
  const beforeCreatedAt = searchParams.get("beforeCreatedAt") ?? "";
  const beforeId = searchParams.get("beforeId") ?? "";
  const limit = Math.min(Math.max(Number.parseInt(limitRaw, 10) || 5, 1), 25);

  if (userIdParam && !isAllowedUser(userIdParam)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  const userIdFilter: UserId | undefined = isAllowedUser(userIdParam) ? userIdParam : undefined;

  const query: {
    userId?: UserId;
    $or?: Array<{ createdAt: { $lt: Date } } | { createdAt: Date; _id: { $lt: ObjectId } }>;
  } = {};

  if (userIdFilter) {
    query.userId = userIdFilter;
  }

  if (beforeCreatedAt || beforeId) {
    if (!beforeCreatedAt || !beforeId) {
      return NextResponse.json({ error: "beforeCreatedAt and beforeId are required together" }, { status: 400 });
    }

    const parsedDate = new Date(beforeCreatedAt);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid beforeCreatedAt" }, { status: 400 });
    }

    if (!ObjectId.isValid(beforeId)) {
      return NextResponse.json({ error: "Invalid beforeId" }, { status: 400 });
    }

    const parsedId = new ObjectId(beforeId);
    query.$or = [{ createdAt: { $lt: parsedDate } }, { createdAt: parsedDate, _id: { $lt: parsedId } }];
  }

  await ensureIndexes();
  const db = await getDb();
  const photos = db.collection("food_photos");

  const docs = await photos
    .find(query)
    .project({ _id: 1, userId: 1, dateKey: 1, imageDataUrl: 1, createdAt: 1 })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = docs.length > limit;
  const items = docs.slice(0, limit).map((item) => ({
    id: String(item._id),
    userId: item.userId,
    dateKey: item.dateKey,
    imageDataUrl: item.imageDataUrl,
    createdAt: item.createdAt,
  }));

  return NextResponse.json({ items, hasMore });
}

export async function POST(req: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { userId, dateKey, images } = body as {
    userId?: string;
    dateKey?: string;
    images?: string[];
  };

  if (!userId || !isAllowedUser(userId)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }
  if (!dateKey || !isValidDateKey(dateKey)) {
    return NextResponse.json({ error: "Invalid dateKey" }, { status: 400 });
  }
  if (!Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: "At least one image is required" }, { status: 400 });
  }
  if (images.length > 10) {
    return NextResponse.json({ error: "Maximum 10 images per upload" }, { status: 400 });
  }

  for (const imageDataUrl of images) {
    if (typeof imageDataUrl !== "string" || !isValidDataUrl(imageDataUrl)) {
      return NextResponse.json(
        { error: "Invalid image format. Use jpeg/png/webp/heic/heif data URLs" },
        { status: 400 }
      );
    }

    const estimatedBytes = estimateDataUrlSizeBytes(imageDataUrl);
    if (estimatedBytes > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Each image must be 5MB or less" }, { status: 400 });
    }
  }

  await ensureIndexes();
  const db = await getDb();
  const photos = db.collection("food_photos");

  const now = new Date();
  const docs = images.map((imageDataUrl) => ({
    _id: new ObjectId(),
    userId,
    dateKey,
    imageDataUrl,
    createdAt: now,
  }));

  await photos.insertMany(docs);

  return NextResponse.json({ ok: true, inserted: docs.length });
}

export async function DELETE(req: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { photoId, userId } = body as { photoId?: string; userId?: string };

  if (!photoId || !ObjectId.isValid(photoId)) {
    return NextResponse.json({ error: "Invalid photoId" }, { status: 400 });
  }
  if (!userId || !isAllowedUser(userId)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  await ensureIndexes();
  const db = await getDb();
  const photos = db.collection("food_photos");

  const result = await photos.deleteOne({ _id: new ObjectId(photoId), userId });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "Photo not found or not owned by user" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
