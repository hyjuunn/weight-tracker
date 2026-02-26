import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json();

  if (password === process.env.APP_SHARED_PASSWORD) {
    const response = NextResponse.json({ success: true });

    response.cookies.set("session", "authenticated", {
      httpOnly: true,
      path: "/",
    });

    return response;
  }

  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}