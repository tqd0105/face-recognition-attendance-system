"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, CalendarClock, MailCheck, MailWarning, RefreshCw, Search } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { attendanceService } from "@/services/attendance.service";
import type { NotificationLogItem } from "@/types/models";
import { useAuth } from "@/hooks/useAuth";

const typeOptions = [
    { value: "", label: "All types" },
    { value: "schedule_reminder", label: "Schedule reminder" },
    { value: "late_attendance", label: "Late attendance" },
    { value: "absent_attendance", label: "Absent attendance" },
] as const;

const statusOptions = [
    { value: "", label: "All statuses" },
    { value: "sent", label: "Sent" },
    { value: "failed", label: "Failed" },
    { value: "skipped", label: "Skipped" },
    { value: "pending", label: "Pending" },
] as const;

function typeLabel(value?: string): string {
    if (value === "schedule_reminder") return "Schedule";
    if (value === "late_attendance") return "Late";
    if (value === "absent_attendance") return "Absent";
    return value || "-";
}

function formatDateTime(value?: string | null): string {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Ho_Chi_Minh",
    }).format(parsed);
}

function formatSession(value?: string): string {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
    return new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
    }).format(parsed);
}

function statusClass(value?: string): string {
    if (value === "sent") return "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700";
    if (value === "failed") return "rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700";
    if (value === "skipped") return "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600";
    return "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700";
}

export default function NotificationsPage() {
    const { user } = useAuth();
    const [rows, setRows] = useState<NotificationLogItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [typeFilter, setTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [search, setSearch] = useState("");

    const loadNotifications = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await attendanceService.getNotificationHistory({
                limit: 100,
                type: typeFilter || undefined,
                status: statusFilter || undefined,
            });
            setRows(Array.isArray(data.data) ? data.data : []);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Cannot load notification history";
            setError(message);
            setRows([]);
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, typeFilter]);

    useEffect(() => {
        if (user.role !== "teacher" && user.role !== "admin") {
            setError("Only teacher or admin can view notification history.");
            setIsLoading(false);
            return;
        }
        void loadNotifications();
    }, [loadNotifications, user.role]);

    const visibleRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((item) => {
            const haystack = [
                item.subject,
                item.recipient_email,
                item.recipient_role,
                item.student_code,
                item.student_name,
                item.course_code,
                item.course_name,
                item.teacher_name,
                item.status,
                item.notification_type,
            ].join(" ").toLowerCase();
            return haystack.includes(q);
        });
    }, [rows, search]);

    const stats = useMemo(() => {
        return rows.reduce(
            (acc, item) => {
                acc.total += 1;
                if (item.status === "sent") acc.sent += 1;
                if (item.status === "failed") acc.failed += 1;
                if (item.recipient_role === "parent") acc.parent += 1;
                return acc;
            },
            { total: 0, sent: 0, failed: 0, parent: 0 },
        );
    }, [rows]);

    const columns = useMemo(
        () => [
            {
                key: "type",
                title: "Type",
                render: (row: NotificationLogItem) => (
                    <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-700">{typeLabel(row.notification_type)}</span>
                ),
            },
            {
                key: "recipient",
                title: "Recipient",
                className: "min-w-[220px]",
                render: (row: NotificationLogItem) => (
                    <div>
                        <p className="font-semibold text-slate-900">{row.recipient_email}</p>
                        <p className="text-xs capitalize text-slate-500">{row.recipient_role}</p>
                    </div>
                ),
            },
            {
                key: "student",
                title: "Student",
                render: (row: NotificationLogItem) => (
                    <div>
                        <p className="font-semibold text-slate-900">{row.student_name ?? "-"}</p>
                        <p className="text-xs text-slate-500">{row.student_code ?? "-"}</p>
                    </div>
                ),
            },
            {
                key: "session",
                title: "Session",
                className: "min-w-[240px]",
                render: (row: NotificationLogItem) => (
                    <div>
                        <p className="font-semibold text-slate-900">{row.course_code ?? "-"}{row.course_name ? ` - ${row.course_name}` : ""}</p>
                        <p className="text-xs text-slate-500">{formatSession(row.session_date)} | {row.start_time ?? "--:--"} - {row.end_time ?? "--:--"}</p>
                    </div>
                ),
            },
            {
                key: "status",
                title: "Status",
                render: (row: NotificationLogItem) => <span className={statusClass(row.status)}>{row.status?.toUpperCase() ?? "UNKNOWN"}</span>,
            },
            { key: "sent", title: "Sent At", render: (row: NotificationLogItem) => formatDateTime(row.sent_at ?? row.created_at) },
            {
                key: "error",
                title: "Error",
                className: "min-w-[220px]",
                render: (row: NotificationLogItem) => row.error_message ? <span className="text-xs font-medium text-rose-700">{row.error_message}</span> : "-",
            },
        ],
        [],
    );

    return (
        <main className="motion-page space-y-4 px-1 py-1 sm:px-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <header className="rounded-2xl bg-gradient-to-br from-slate-900 via-cyan-900 to-emerald-900 p-5 text-white shadow-lg sm:p-6">
                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">
                        <BellRing className="h-4 w-4" /> Notification Center
                    </p>
                    <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Notification History</h1>
                    <p className="mt-2 text-sm text-slate-100">Track schedule reminders and attendance alerts sent to students and parents.</p>
                </header>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <article className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700"><MailCheck className="h-4 w-4" /> Total</p>
                        <p className="mt-2 text-2xl font-bold text-blue-900">{stats.total}</p>
                    </article>
                    <article className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700"><MailCheck className="h-4 w-4" /> Sent</p>
                        <p className="mt-2 text-2xl font-bold text-emerald-900">{stats.sent}</p>
                    </article>
                    <article className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-700"><MailWarning className="h-4 w-4" /> Failed</p>
                        <p className="mt-2 text-2xl font-bold text-rose-900">{stats.failed}</p>
                    </article>
                    <article className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700"><CalendarClock className="h-4 w-4" /> Parents</p>
                        <p className="mt-2 text-2xl font-bold text-cyan-900">{stats.parent}</p>
                    </article>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div className="relative min-w-[240px] flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search recipient, student, course, status..."
                        />
                    </div>
                    <select
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                        value={typeFilter}
                        onChange={(event) => setTypeFilter(event.target.value)}
                    >
                        {typeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                    <select
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                    >
                        {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                    <button
                        type="button"
                        className="interactive-btn inline-flex items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-60"
                        onClick={() => { void loadNotifications(); }}
                        disabled={isLoading}
                    >
                        <RefreshCw className="h-4 w-4" /> Refresh
                    </button>
                </div>

                <div className="mt-4 md:rounded-2xl md:border md:border-slate-200 md:bg-slate-50 md:p-3 md:shadow-sm">
                    {isLoading && <LoadingState label="Loading notification history..." />}
                    {!isLoading && error && <ErrorState label={error} />}
                    {!isLoading && !error && <DataTable columns={columns} rows={visibleRows} emptyText="No notification records found" />}
                </div>
            </section>
        </main>
    );
}
