"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  return (
    <button
      className="inline-flex h-11 items-center justify-center rounded-xl border border-white/20 bg-black/25 px-4 text-sm font-medium text-white transition hover:border-white/35 hover:bg-black/35"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    >
      Logout
    </button>
  );
}
