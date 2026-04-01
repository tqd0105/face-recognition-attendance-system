"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, GraduationCap, LogIn, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/models";

export default function LoginPage() {
    const router = useRouter();
    const { user, isHydrated, isLoggingIn, login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<Exclude<UserRole, "guest">>("teacher");
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        if (isHydrated && user.token) {
            router.replace("/");
        }
    }, [isHydrated, user.token, router]);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!email.trim() || !password.trim()) {
            setNotice("Please enter email and password.");
            return;
        }

        try {
            setNotice(null);
            await login({ email, password, role });
            router.push("/");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Login failed";
            setNotice(message);
        }
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
                        Login with JWT and access Dashboard, Students, Classes, Sessions, Realtime Attendance, and History.
                    </p>

                    <div className="motion-stagger mt-5 grid gap-3">
                        <div className="interactive-card rounded-2xl border border-white/20 bg-white/10 p-4" data-role="teacher">
                            <p className="inline-flex items-center gap-2 text-sm font-semibold">
                                <ShieldCheck className="h-4 w-4" /> Teacher account
                            </p>
                            <p className="mt-1 text-sm text-slate-100">Full management access including create actions.</p>
                        </div>
                        <div className="interactive-card rounded-2xl border border-white/20 bg-white/10 p-4" data-role="student">
                            <p className="inline-flex items-center gap-2 text-sm font-semibold">
                                <GraduationCap className="h-4 w-4" /> Student account
                            </p>
                            <p className="mt-1 text-sm text-slate-100">Read and monitor attendance flow with restricted writes.</p>
                        </div>
                    </div>
                </aside>

                <div className="motion-hero rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Authentication</p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">Sign in to continue</h2>

                    <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-800">Choose account mode</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <button
                                type="button"
                                className={`interactive-btn rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${role === "teacher"
                                        ? "border-blue-300 bg-blue-100 text-blue-900 shadow"
                                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                    }`}
                                onClick={() => setRole("teacher")}
                            >
                                Teacher mode
                            </button>
                            <button
                                type="button"
                                className={`interactive-btn rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${role === "student"
                                        ? "border-indigo-300 bg-indigo-100 text-indigo-900 shadow"
                                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                    }`}
                                onClick={() => setRole("student")}
                            >
                                Student mode
                            </button>
                        </div>
                    </div>

                    <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
                        <div>
                            <label className="text-sm font-semibold text-slate-700" htmlFor="email">
                                Email
                            </label>
                            <input
                                id="email"
                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoComplete="username"
                                placeholder="teacher@example.com"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-slate-700" htmlFor="password">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            className="interactive-btn inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isLoggingIn}
                            type="submit"
                        >
                            <LogIn className="h-5 w-5" />
                            {isLoggingIn ? "Signing in..." : "Sign In"}
                        </button>
                    </form>

                    {notice && (
                        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 shadow-sm">
                            {notice}
                        </div>
                    )}

                    {/* <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
                        <p className="inline-flex items-center gap-2 font-semibold">
                            <AlertTriangle className="h-4 w-4" />
                            JWT token is saved in browser localStorage after successful login.
                        </p>
                    </div> */}
                </div>
            </section>
        </main>
    );
}
