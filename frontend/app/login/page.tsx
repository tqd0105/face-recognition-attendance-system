"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, LogIn } from "lucide-react";
import { backendUrl, clearAccessToken, getAccessToken, setAccessToken } from "@/lib/backend";

type LoginResponse = {
  token?: string;
  message?: string;
  teacher_name?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const existingToken = typeof window !== "undefined" ? getAccessToken() : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

      setAccessToken(data.token);
      setNotice(`Login success${data.teacher_name ? ` - ${data.teacher_name}` : ""}`);
      router.push("/teacher");
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

  if (existingToken) {
    router.replace("/teacher");
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-5 shadow-xl sm:p-7">
        <header className="rounded-2xl bg-slate-800 p-5 text-white shadow-lg">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2.5 shadow-md">
              <KeyRound className="h-7 w-7" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]">Teacher Login</p>
          </div>
          <h1 className="text-2xl font-bold">Sign in to get API token</h1>
          <p className="mt-2 text-sm text-slate-100">
            Token is stored in browser localStorage and automatically used by Enrollment and Attendance pages.
          </p>
        </header>

        <form className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm" onSubmit={onSubmit}>
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
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              <LogIn className="h-5 w-5" />
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 hover:shadow-md"
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

        <footer className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-blue-700">
          <Link className="rounded-lg px-2 py-1 hover:bg-blue-50" href="/enrollment">
            Go to enrollment
          </Link>
          <Link className="rounded-lg px-2 py-1 hover:bg-blue-50" href="/attendance">
            Go to attendance
          </Link>
        </footer>
      </section>
    </main>
  );
}
