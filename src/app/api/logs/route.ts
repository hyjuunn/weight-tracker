import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb, ensureIndexes } from "@/lib/mongo";

const ALLOWED_USERS = ["Eric", "Jun", "Jaehah"] as const;
type UserId = (typeof ALLOWED_USERS)[number];

function isValidDateKey(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isAllowedUser(u: string): u is UserId {
  return (ALLOWED_USERS as readonly string[]).includes(u);
}

async function requireSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  return !!session;
}

export async function GET(req: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";

  if (!isAllowedUser(userId)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }
  if (!isValidDateKey(from) || !isValidDateKey(to)) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  await ensureIndexes();
  const db = await getDb();
  const logs = db.collection("daily_logs");

  const items = await logs
    .find({ userId, dateKey: { $gte: from, $lte: to } })
    .project({ _id: 0, userId: 1, dateKey: 1, weightKg: 1, note: 1, updatedAt: 1 })
    .sort({ dateKey: 1 })
    .toArray();

  return NextResponse.json({ items });
}

export async function PUT(req: Request) {
  if (!(await requireSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { userId, dateKey, weightKg, note } = body as {
    userId?: string;
    dateKey?: string;
    weightKg?: number | null;
    note?: string | null;
  };

  if (!userId || !isAllowedUser(userId)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }
  if (!dateKey || !isValidDateKey(dateKey)) {
    return NextResponse.json({ error: "Invalid dateKey" }, { status: 400 });
  }

  if (weightKg !== null && weightKg !== undefined) {
    if (typeof weightKg !== "number" || !Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 500) {
      return NextResponse.json({ error: "Invalid weightKg" }, { status: 400 });
    }
  }

  if (note !== null && note !== undefined) {
    if (typeof note !== "string") return NextResponse.json({ error: "Invalid note" }, { status: 400 });
    if (note.length > 2000) return NextResponse.json({ error: "Note too long" }, { status: 400 });
  }

  await ensureIndexes();
  const db = await getDb();
  const logs = db.collection("daily_logs");

  const now = new Date();

  await logs.updateOne(
    { userId, dateKey },
    {
      $set: {
        userId,
        dateKey,
        ...(weightKg !== undefined ? { weightKg } : {}),
        ...(note !== undefined ? { note } : {}),
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  return NextResponse.json({ ok: true });
}