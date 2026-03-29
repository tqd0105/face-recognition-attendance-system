"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { clearAccessToken, getAccessToken } from "@/lib/backend";

export default function TeacherPage() {
  const router = useRouter();
  const token = typeof window !== "undefined" ? getAccessToken() : null;

  function logout() {
    clearAccessToken();
    router.replace("/login");
  }

  if (!token) {
    router.replace("/login");
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-5 shadow-xl sm:p-7">
        <header className="rounded-2xl bg-slate-800 p-5 text-white shadow-lg">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2.5 shadow-md">
              <LayoutDashboard className="h-7 w-7" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">Teacher Workspace</p>
          </div>
          <h1 className="text-2xl font-bold">You are signed in</h1>
          <p className="mt-2 text-sm text-slate-100">Use this workspace to open protected enrollment and attendance screens.</p>
        </header>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link className="rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm transition hover:shadow-md" href="/enrollment">
            <p className="text-lg font-bold text-blue-900">Enrollment</p>
            <p className="mt-1 text-sm text-blue-800">Manage course enrollment for students.</p>
          </Link>

          <Link className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm transition hover:shadow-md" href="/attendance">
            <p className="text-lg font-bold text-indigo-900">Attendance</p>
            <p className="mt-1 text-sm text-indigo-800">Monitor check-in data and realtime events.</p>
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-900 hover:shadow-lg"
            href="/"
          >
            <ShieldCheck className="h-5 w-5" />
            Back to Home
          </Link>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 hover:shadow-md"
            onClick={logout}
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </section>
    </main>
  );
}
