import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";
import { LogoutButton } from "./LogoutButton";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) redirect("/login");

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-6xl space-y-6 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Weight Tracker</p>
            <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Dashboard</h1>
          </div>
          <LogoutButton />
        </div>
        <DashboardClient />
      </div>
    </main>
  );
}
