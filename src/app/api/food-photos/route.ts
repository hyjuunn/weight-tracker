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
  const limit = Math.min(Math.max(Number.parseInt(limitRaw, 10) || 5, 1), 25);

  await ensureIndexes();
  const db = await getDb();
  const photos = db.collection("food_photos");

  const items = await photos
    .find({})
    .project({ _id: 1, userId: 1, dateKey: 1, imageDataUrl: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return NextResponse.json({
    items: items.map((item) => ({
      id: String(item._id),
      userId: item.userId,
      dateKey: item.dateKey,
      imageDataUrl: item.imageDataUrl,
      createdAt: item.createdAt,
    })),
  });
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
