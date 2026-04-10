"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Users, School, BookOpen, CalendarClock, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { adminService } from "@/services/admin.service";

type Overview = {
    teachers?: number;
    students?: { total?: number; active?: number; inactive?: number };
    home_classes?: number;
    course_classes?: number;
    sessions?: { scheduled?: number; active?: number; completed?: number; canceled?: number };
    attendance?: { today?: number; total?: number };
};

type Guardrails = {
    biometric_min_quality?: number;
    biometric_reenroll_min_similarity?: number;
    biometric_duplicate_similarity_threshold?: number;
    biometric_self_vs_other_margin?: number;
    biometric_strict_uniqueness?: boolean;
    session_lifecycle_interval_ms?: number;
};

export default function AdminPage() {
    const { user } = useAuth();
    const [overview, setOverview] = useState<Overview | null>(null);
    const [guardrails, setGuardrails] = useState<Guardrails | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            if (user.role !== "admin") {
                setError("Only admin can access this dashboard.");
                return;
            }

            try {
                setError(null);
                const [ov, gr] = await Promise.all([adminService.getOverview(), adminService.getGuardrails()]);
                setOverview(ov ?? null);
                setGuardrails(gr ?? null);
            } catch (err) {
                const message = err instanceof Error ? err.message : "Cannot load admin dashboard";
                setError(message);
            }
        }

        void load();
    }, [user.role]);

    return (
        <main className="motion-page space-y-4 px-1 py-1 sm:px-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <header className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-5 text-white shadow-lg sm:p-6">
                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]"><ShieldCheck className="h-4 w-4" /> Admin Scope</p>
                    <h1 className="mt-2 text-2xl font-bold sm:text-3xl">System Administration Dashboard</h1>
                    <p className="mt-2 text-sm text-slate-100">Admin-only metrics and security guardrails for school-wide operations.</p>
                </header>

                {error && (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                        {error}
                    </div>
                )}

                {!error && (
                    <>
                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <article className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700"><Users className="h-4 w-4" /> Teachers</p>
                                <p className="mt-2 text-2xl font-bold text-blue-900">{overview?.teachers ?? 0}</p>
                            </article>
                            <article className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700"><School className="h-4 w-4" /> Students</p>
                                <p className="mt-2 text-2xl font-bold text-indigo-900">{overview?.students?.total ?? 0}</p>
                                <p className="mt-1 text-xs text-indigo-700">Active: {overview?.students?.active ?? 0} | Inactive: {overview?.students?.inactive ?? 0}</p>
                            </article>
                            <article className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700"><ClipboardList className="h-4 w-4" /> Attendance Today</p>
                                <p className="mt-2 text-2xl font-bold text-emerald-900">{overview?.attendance?.today ?? 0}</p>
                                <p className="mt-1 text-xs text-emerald-700">Total logs: {overview?.attendance?.total ?? 0}</p>
                            </article>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700"><School className="h-4 w-4" /> Home Classes</p>
                                <p className="mt-2 text-xl font-bold text-slate-900">{overview?.home_classes ?? 0}</p>
                            </article>
                            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700"><BookOpen className="h-4 w-4" /> Course Classes</p>
                                <p className="mt-2 text-xl font-bold text-slate-900">{overview?.course_classes ?? 0}</p>
                            </article>
                            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700"><CalendarClock className="h-4 w-4" /> Sessions</p>
                                <p className="mt-2 text-xs text-slate-700">Scheduled: {overview?.sessions?.scheduled ?? 0}</p>
                                <p className="text-xs text-slate-700">Active: {overview?.sessions?.active ?? 0}</p>
                                <p className="text-xs text-slate-700">Completed: {overview?.sessions?.completed ?? 0}</p>
                                <p className="text-xs text-slate-700">Canceled: {overview?.sessions?.canceled ?? 0}</p>
                            </article>
                        </div>

                        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Guardrails (Read-only)</p>
                            <div className="mt-2 grid gap-2 text-sm text-amber-900 sm:grid-cols-2">
                                <p>Min quality: <span className="font-semibold">{guardrails?.biometric_min_quality ?? "-"}</span></p>
                                <p>Re-enroll min similarity: <span className="font-semibold">{guardrails?.biometric_reenroll_min_similarity ?? "-"}</span></p>
                                <p>Duplicate threshold: <span className="font-semibold">{guardrails?.biometric_duplicate_similarity_threshold ?? "-"}</span></p>
                                <p>Self-vs-other margin: <span className="font-semibold">{guardrails?.biometric_self_vs_other_margin ?? "-"}</span></p>
                                <p>Strict uniqueness: <span className="font-semibold">{String(guardrails?.biometric_strict_uniqueness ?? "-")}</span></p>
                                <p>Lifecycle interval (ms): <span className="font-semibold">{guardrails?.session_lifecycle_interval_ms ?? "-"}</span></p>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}
