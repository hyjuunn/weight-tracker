import { NextResponse } from "next/server";
import { getDb, ensureIndexes } from "@/lib/mongo";

export async function GET() {
  const db = await getDb();
  await ensureIndexes();

  // ping
  await db.command({ ping: 1 });

  return NextResponse.json({ ok: true });
}