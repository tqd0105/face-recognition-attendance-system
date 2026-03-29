"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, GraduationCap, KeyRound, LogIn, ShieldCheck, Sparkles } from "lucide-react";
import { backendUrl, clearAccessToken, getAuthSession, setAuthSession, type UserRole } from "@/lib/backend";

type LoginResponse = {
  token?: string;
  message?: string;
  teacher_name?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const authSession = typeof window !== "undefined" ? getAuthSession() : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Exclude<UserRole, "guest">>("teacher");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setNotice("Please enter email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      setNotice(null);

      const response = await fetch(backendUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json().catch(() => ({}))) as LoginResponse;
      if (!response.ok || !data.token) {
        setNotice(data.message ?? "Login failed. Check credentials.");
        return;
      }

      const displayName = data.teacher_name ?? (role === "teacher" ? "Teacher" : "Student");
      setAuthSession(data.token, role, displayName);
      setNotice(`Login success - ${displayName}`);
      router.push("/");
    } catch {
      setNotice("Cannot connect to backend service.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function logout() {
    clearAccessToken();
    setNotice("Token cleared on this browser.");
  }

  if (authSession?.token) {
    router.replace("/");
    return null;
  }

  return (
    <main className="motion-page relative min-h-screen overflow-hidden bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-20 top-8 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-8 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />

      <section className="relative mx-auto grid w-full max-w-5xl gap-4 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.55)] sm:p-7 lg:grid-cols-[1.1fr_1fr]">
        <aside className="motion-hero rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-5 text-white shadow-lg sm:p-7">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
            <Sparkles className="h-4 w-4" />
            Secure Entry
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight">Role-based Sign In</h1>
          <p className="mt-3 text-sm text-slate-100">
            Session data is synchronized across Home, Enrollment, Attendance, and dedicated role workspaces.
          </p>

          <div className="motion-stagger mt-5 grid gap-3">
            <div className="interactive-card rounded-2xl border border-white/20 bg-white/10 p-4" data-role="teacher">
              <p className="inline-flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4" /> Teacher account
              </p>
              <p className="mt-1 text-sm text-slate-100">Full operation access: enrollment, check-in creation, and realtime control.</p>
            </div>
            <div className="interactive-card rounded-2xl border border-white/20 bg-white/10 p-4" data-role="student">
              <p className="inline-flex items-center gap-2 text-sm font-semibold">
                <GraduationCap className="h-4 w-4" /> Student account
              </p>
              <p className="mt-1 text-sm text-slate-100">Read-only monitoring access with role guard for protected write actions.</p>
            </div>
          </div>
        </aside>

        <div className="motion-hero rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-2.5 text-white shadow">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Authentication</p>
              <h2 className="text-xl font-bold text-slate-900">Sign in to continue</h2>
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-800">Choose account mode</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className={`interactive-btn rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${role === "teacher"
                  ? "border-blue-300 bg-blue-100 text-blue-900 shadow"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                data-role="teacher"
                onClick={() => setRole("teacher")}
              >
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Teacher mode
                </span>
                <p className="mt-1 text-xs font-medium text-slate-600">Full access to enrollment and attendance controls.</p>
              </button>
              <button
                type="button"
                className={`interactive-btn rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${role === "student"
                  ? "border-indigo-300 bg-indigo-100 text-indigo-900 shadow"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                data-role="student"
                onClick={() => setRole("student")}
              >
                <span className="inline-flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" /> Student mode
                </span>
                <p className="mt-1 text-xs font-medium text-slate-600">Read-only experience with attendance overview.</p>
              </button>
            </div>
          </div>

          <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
            <label className="text-sm font-semibold text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              placeholder="teacher@example.com"
            />

            <label className="text-sm font-semibold text-slate-700" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />

            <div className="mt-1 flex flex-wrap gap-3">
              <button
                className="interactive-btn inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                data-role={role}
                disabled={isSubmitting}
                type="submit"
              >
                <LogIn className="h-5 w-5" />
                {isSubmitting ? "Signing in..." : "Sign In"}
              </button>
              <button
                type="button"
                className="interactive-btn inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 hover:shadow-md"
                data-role={role}
                onClick={logout}
              >
                Clear Token
              </button>
            </div>
          </form>

          {notice && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 shadow-md">
              {notice}
            </div>
          )}

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
            <p className="inline-flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Protected actions are blocked when not signed in.
            </p>
            <p className="mt-1">Guest users will see warning modal before opening restricted feature modules.</p>
          </div>

          <footer className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-blue-700">
            <Link className="rounded-lg px-2 py-1 hover:bg-blue-50" href="/">
              Back to home
            </Link>
            <button className="rounded-lg px-2 py-1 hover:bg-blue-50" type="button" onClick={logout}>
              Clear local session
            </button>
          </footer>
        </div>
      </section>
    </main>
  );
}
