"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/dashboard");
      } else {
        alert("Wrong password");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(255,255,255,0.12),transparent_40%),radial-gradient(circle_at_85%_80%,rgba(102,142,255,0.22),transparent_35%)]" />

      <section className="relative z-10 w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
          Weight Tracker
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-300">
          Enter your shared password to access the dashboard.
        </p>

        <div className="mt-8 space-y-3">
          <label htmlFor="password" className="text-sm font-medium text-slate-200">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Enter shared password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 w-full rounded-xl border border-white/15 bg-black/30 px-4 text-base text-white placeholder:text-slate-400 outline-none transition focus:border-white/40 focus:ring-2 focus:ring-indigo-400/50"
          />
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="mt-3 flex h-12 w-full items-center justify-center rounded-xl bg-white text-base font-semibold text-black transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Signing in..." : "Login"}
          </button>
        </div>
      </section>
    </main>
  );
}
